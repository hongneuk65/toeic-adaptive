import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class Das3hService {
  private readonly LEARNING_RATE = 0.03;

  // Cửa sổ thời gian rời rạc (disjoint intervals theo ngày): [lower, upper)
  // [0, 1): trong vòng 24h
  // [1, 7): 1 đến 7 ngày
  // [7, 30): 1 tuần đến 1 tháng
  // [30, 90): 1 đến 3 tháng
  // [90, 180): 3 đến 6 tháng
  readonly TIME_INTERVALS: readonly [number, number][] = [
    [0, 1],
    [1, 7],
    [7, 30],
    [30, 90],
    [90, 180],
  ];

  // Trọng số tiên nghiệm Ebbinghaus đơn điệu phân rã theo thời gian (Tổng biên độ |theta| <= 1.5)
  readonly DEFAULT_THETA: readonly number[] = [
    0.50, -0.35,  // [0, 1) ngày (Win, Loss)
    0.35, -0.25,  // [1, 7) ngày (Win, Loss)
    0.25, -0.18,  // [7, 30) ngày (Win, Loss)
    0.15, -0.10,  // [30, 90) ngày (Win, Loss)
    0.08, -0.05,  // [90, 180) ngày (Win, Loss)
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phương thức đồng bộ hóa lịch sử và kích hoạt SGD + Mastery
   */
  async recordAndSync(userId: number, questionId: number, isCorrect: boolean, skillIds: number[], jobId?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Serialize learning events for a user; retries roll back all partial writes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::bigint)`;
      if (jobId && await tx.processedMasteryJob.findUnique({ where: { id: jobId } })) return;
      await this.syncRecord(tx, userId, questionId, isCorrect, [...new Set(skillIds)]);
      if (jobId) await tx.processedMasteryJob.create({ data: { id: jobId } });
    }, { timeout: 15000 });
  }

  private async syncRecord(db: Prisma.TransactionClient, userId: number, questionId: number, isCorrect: boolean, skillIds: number[]) {
    const validUserId = Number(userId);
    const validQuestionId = Number(questionId);

    // Predict BEFORE recording this answer to avoid target leakage in SGD.
    await this.updateAbilityOnline(validUserId, validQuestionId, isCorrect, db);
    if (skillIds.length) await db.studentSkillHistory.createMany({
      data: skillIds.map((skillId) => ({
        userId: validUserId,
        questionId: validQuestionId,
        skillId: Number(skillId),
        isCorrect,
      })),
    });

    await db.question.update({
      where: { id: validQuestionId },
      data: { totalAttempts: { increment: 1 }, totalCorrect: { increment: Number(isCorrect) } },
    });

    // 3. Cập nhật điểm Mastery Score mới cho từng vi kỹ năng liên quan
    const now = new Date();
    for (const skillId of skillIds) {
      const validSkillId = Number(skillId);
      const newMasteryScore = await this.getSkillMastery(validUserId, validSkillId, db);

      await db.userSkillMastery.upsert({
        where: {
          userId_skillId: {
            userId: validUserId,
            skillId: validSkillId,
          },
        },
        update: {
          masteryScore: newMasteryScore,
          practiceCount: { increment: 1 },
          lastPracticed: now,
        },
        create: {
          userId: validUserId,
          skillId: validSkillId,
          masteryScore: newMasteryScore,
          practiceCount: 1,
          lastPracticed: now,
        },
      });
    }
  }

  /**
   * Kiểm tra câu trả lời của học sinh, tự động xác định đúng/sai,
   * đồng bộ vào DAS3H và trả về đáp án đúng cùng lời giải thích.
   */
  async checkAndRecordAnswer(
    userId: number,
    questionId: number,
    selectedAnswer: string,
    skillId?: number,
  ): Promise<{ isCorrect: boolean; correctAnswer: string; explanation: string | null }> {
    const validUserId = Number(userId);
    const validQuestionId = Number(questionId);

    const question = await this.prisma.question.findUnique({
      where: { id: validQuestionId },
      include: { skills: true },
    });

    if (!question) {
      throw new NotFoundException(`Không tìm thấy câu hỏi với ID #${validQuestionId}`);
    }

    if (typeof selectedAnswer !== 'string' || !/^[ABCD]$/i.test(selectedAnswer.trim())) {
      throw new BadRequestException('Đáp án phải là A, B, C hoặc D');
    }
    const isCorrect = question.correctAnswer.trim().toUpperCase() === selectedAnswer.trim().toUpperCase();
    const skillIds = question.skills.map((s) => s.skillId);
    if (skillId && !skillIds.includes(Number(skillId))) {
      throw new BadRequestException('Câu hỏi không thuộc kỹ năng đã chọn');
    }

    await this.recordAndSync(validUserId, validQuestionId, isCorrect, skillIds);

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  }

  /**
   * DỰ ĐOÁN XÁC SUẤT LÀM ĐÚNG (logit = alpha_s - delta_j + (1/M) * sum(beta_k + h_theta_k))
   * Hỗ trợ tích hợp trung bình đa kỹ năng (Multi-skill Aggregation)
   */
  async predictProbCorrect(userId: number, questionId: number, db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { ability: true }, // alpha_s khởi tạo 0.0 hoặc đã cập nhật qua SGD
    });

    const question = await db.question.findUnique({
      where: { id: questionId },
      select: {
        itemDifficulty: true, // Lấy δ_j chuẩn xác theo đúng schema thật của bạn
        skills: {
          select: {
            skillId: true,
          },
        },
      },
    });

    if (!user || !question) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng hoặc câu hỏi để tính toán.');
    }

    const alpha_s = user.ability;
    const rawDelta = question.itemDifficulty; // Sử dụng đúng itemDifficulty đại diện cho δ_j
    const delta_j = this.normalizeItemDifficulty(rawDelta);

    if (!question.skills || question.skills.length === 0) {
      return this.sigmoid(alpha_s - delta_j);
    }

    // Đa kỹ năng: Trung bình cộng đóng góp (beta_k + h_theta_k) của toàn bộ kỹ năng câu hỏi sở hữu
    const skillIds = question.skills.map((s) => s.skillId);
    const skills = await db.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true, easiness: true },
    });

    const easinessMap = new Map(skills.map((s) => [s.id, s.easiness]));

    let totalSkillContribution = 0;
    for (const sId of skillIds) {
      const beta_k = easinessMap.get(sId) ?? 0.0;
      const hTheta_k = await this.calculateHTheta(userId, sId, db);
      totalSkillContribution += (beta_k + hTheta_k);
    }

    const avgSkillContribution = totalSkillContribution / skillIds.length;
    const logit = alpha_s - delta_j + avgSkillContribution;
    return this.sigmoid(logit);
  }

  /**
   * CẬP NHẬT TRỰC TUYẾN NĂNG LỰC NGƯỜI HỌC QUA SGD (Online Update alpha_s)
   * Có ràng buộc chặn ngưỡng [-3.5, 3.5] ngăn chặn trôi dạt giá trị
   */
  async updateAbilityOnline(userId: number, questionId: number, isCorrect: boolean, db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { ability: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng để thực thi SGD.');
    }

    const oldAbility = user.ability;
    const probCorrect = await this.predictProbCorrect(userId, questionId, db);
    const actual = isCorrect ? 1.0 : 0.0;
    const error = actual - probCorrect;

    const newAbility = oldAbility + this.LEARNING_RATE * error;
    // Bounded clipping [-3.5, 3.5] chuẩn hóa theo phân phối IRT TOEIC
    const clampedAbility = Math.max(-3.5, Math.min(3.5, newAbility));

    await db.user.update({
      where: { id: userId },
      data: { ability: clampedAbility },
    });

    return clampedAbility;
  }

  /**
   * TÍNH ĐIỂM THÔNG THẠO KỸ NĂNG TỔNG QUÁT (Tuyệt đối KHÔNG chứa itemDifficulty)
   */
  async getSkillMastery(userId: number, skillId: number, db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { ability: true },
    });

    const skill = await db.skill.findUnique({
      where: { id: skillId },
      select: { easiness: true },
    });

    const alpha_s = user?.ability ?? 0.0;
    const beta_k = skill?.easiness ?? 0.0;
    const hTheta = await this.calculateHTheta(userId, skillId, db);

    const logit = alpha_s + beta_k + hTheta;
    return this.sigmoid(logit);
  }

  /**
   * Đánh giá hàng loạt độ xác suất cho danh sách ứng viên của một kỹ năng mục tiêu
   * Khử triệt để N+1 queries bằng cách tính alpha_s, beta_k, hTheta một lần duy nhất
   */
  async evaluateCandidatesForSkill(
    userId: number,
    skillId: number,
    candidates: Array<{ id: number; itemDifficulty: number }>,
  ): Promise<Array<{ questionId: number; predictedProbability: number }>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ability: true },
    });

    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { easiness: true },
    });

    const alpha_s = user?.ability ?? 0.0;
    const beta_k = skill?.easiness ?? 0.0;
    const hTheta = await this.calculateHTheta(userId, skillId);

    const baseLogit = alpha_s + beta_k + hTheta;

    return candidates.map((c) => {
      const delta_j = this.normalizeItemDifficulty(c.itemDifficulty);
      const logit = baseLogit - delta_j;
      return {
        questionId: c.id,
        predictedProbability: this.sigmoid(logit),
      };
    });
  }

  /**
   * Tính toán hàm lịch sử tích lũy h_theta với các cửa sổ thời gian rời rạc (Disjoint Windows)
   */
  async calculateHTheta(userId: number, skillId: number, db: Prisma.TransactionClient = this.prisma): Promise<number> {
    const now = new Date();

    const history = await db.studentSkillHistory.findMany({
      where: { userId, skillId, createdAt: { gte: new Date(now.getTime() - 180 * 86400000), lte: now } },
      select: { isCorrect: true, createdAt: true },
    });

    if (history.length === 0) return 0.0;

    const wins = Array.from({ length: this.TIME_INTERVALS.length }, () => 0);
    const losses = Array.from({ length: this.TIME_INTERVALS.length }, () => 0);

    for (const record of history) {
      const diffTime = now.getTime() - record.createdAt.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      // Phân bổ bản ghi vào duy nhất 1 cửa sổ rời rạc [lower, upper)
      for (let w = 0; w < this.TIME_INTERVALS.length; w++) {
        const [lower, upper] = this.TIME_INTERVALS[w];
        if (diffDays >= lower && diffDays < upper) {
          if (record.isCorrect) {
            wins[w]++;
          } else {
            losses[w]++;
          }
          break; // Chỉ cộng vào 1 cửa sổ tương ứng, tránh chồng lấn tích lũy sai lệch
        }
      }
    }

    // Đọc trọng số Das3hWeights của vi kỹ năng nếu có, ngược lại dùng DEFAULT_THETA
    const skillWeights = await db.das3hWeights.findUnique({
      where: { skillId },
      select: { theta: true },
    });
    const thetaArray =
      skillWeights?.theta && skillWeights.theta.length === 10
        ? skillWeights.theta
        : this.DEFAULT_THETA;

    let hTheta = 0.0;
    for (let w = 0; w < this.TIME_INTERVALS.length; w++) {
      const thetaWin = thetaArray[w * 2];
      const thetaLoss = thetaArray[w * 2 + 1];
      hTheta += Math.log(1 + wins[w]) * thetaWin + Math.log(1 + losses[w]) * thetaLoss;
    }

    return hTheta;
  }

  /**
   * Chuẩn hóa độ khó câu hỏi về thang logit IRT [-3, 3]
   * Nếu dữ liệu là ETS Equated Delta (> 5), quy đổi sang thang logit: b = (Delta - 11.8) / 1.5
   */
  normalizeItemDifficulty(rawDelta: number): number {
    if (rawDelta > 5.0) {
      return (rawDelta - 11.8) / 1.5;
    }
    return rawDelta;
  }

  sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}