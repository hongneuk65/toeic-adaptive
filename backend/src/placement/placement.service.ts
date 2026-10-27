import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, PlacementAttempt } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  loadModel,
  modelQuestionSelect,
  questionFingerprint,
  sourceQuestionId,
  TrainedDas3h,
} from '../das3h/trained-das3h';
import { PrismaService } from '../prisma/prisma.service';
import { questionSelect } from '../common/question-select';
import { importedQuestions } from '../common/imported-questions';
import { publicStimulus } from '../exam/public-stimulus';
import { buildListeningPlan } from '../exam/listening-plan';
import { PlacementPreferencesDto, SubmitPlacementDto } from './placement.dto';
import {
  buildPlacementPool,
  canCompleteBlueprint,
  LIMITATIONS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  PlacementGroup,
  PlacementQuestion,
  PlacementResponse,
  placementResult,
  POLICY_VERSION,
  QUOTAS,
  selectPlacementGroup,
  snapshotFingerprint,
} from './placement-policy';

const bankSelect = {
  ...questionSelect,
  explanation: true,
  difficulty: true,
  itemDifficulty: true,
  correctAnswer: true,
  skills: {
    orderBy: { skillId: 'asc' as const },
    select: { skillId: true, skill: { select: { name: true } } },
  },
} satisfies Prisma.QuestionSelect;
const json = (value: unknown) => value as Prisma.InputJsonValue;
const groups = (attempt: PlacementAttempt) =>
  attempt.issued as unknown as PlacementGroup[];
const responses = (attempt: PlacementAttempt) =>
  attempt.responses as unknown as PlacementResponse[];
const preferences = (value: unknown) => {
  const p = value as { goal?: string; targetScore?: number } | null;
  return {
    goal: ['FOUNDATION', 'BALANCED', 'CHALLENGE'].includes(p?.goal ?? '')
      ? p!.goal!
      : 'BALANCED',
    targetScore: p?.targetScore ?? null,
  };
};
const adjustableParts = (pool: PlacementGroup[]) =>
  Object.keys(QUOTAS)
    .map(Number)
    .filter((part) => {
      const candidates = pool.filter((g) => g.part === part);
      return (
        new Set(candidates.map((g) => g.difficultyLevel)).size > 1 &&
        QUOTAS[part] > Math.min(...candidates.map((g) => g.questions.length))
      );
    });

@Injectable()
export class PlacementService {
  constructor(private readonly prisma: PrismaService) {}
  private fittedModel() {
    return loadModel();
  }
  private async lock(db: Prisma.TransactionClient, userId: number) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::bigint)`;
  }
  private async pool(
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return buildPlacementPool(
      (await db.question.findMany({
        where: { ...importedQuestions, part: { gte: 1, lte: 7 } },
        select: bankSelect,
      })) as PlacementQuestion[],
      this.fittedModel(),
    );
  }
  private async expire(db: Prisma.TransactionClient, userId: number) {
    await db.placementAttempt.updateMany({
      where: { userId, status: 'ACTIVE', deadlineAt: { lte: new Date() } },
      data: { status: 'EXPIRED', completedAt: new Date() },
    });
  }
  async overview(userId: number) {
    const [user, pool] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { learningPreferences: true },
      }),
      this.pool(),
    ]);
    const sessions = await this.prisma.$transaction(async (db) => {
      await this.lock(db, userId);
      await this.expire(db, userId);
      const active = await db.placementAttempt.findFirst({
        where: { userId, status: 'ACTIVE' },
      });
      const latest = await db.placementAttempt.findFirst({
        where: { userId, status: 'COMPLETED' },
        orderBy: { startedAt: 'desc' },
      });
      return {
        active: active ? await this.view(active, db) : null,
        latest: latest ? await this.view(latest, db) : null,
      };
    });
    const byPart = Object.keys(QUOTAS)
      .map(Number)
      .map((part) => ({
        part,
        groups: pool.filter((g) => g.part === part).length,
      }));
    const adaptiveParts = adjustableParts(pool);
    const available =
      canCompleteBlueprint(pool, [], []) && adaptiveParts.length > 0;
    return {
      ...sessions,
      preferences: preferences(user.learningPreferences),
      catalog: {
        available,
        byPart,
        adaptiveParts,
        ...(!available
          ? {
              reason:
                'Chưa đủ nhóm câu hoặc mức khó đã xác minh để mở đánh giá thích ứng.',
            }
          : {}),
      },
    };
  }
  async savePreferences(userId: number, dto: PlacementPreferencesDto) {
    const value = { goal: dto.goal, targetScore: dto.targetScore ?? null };
    await this.prisma.user.update({
      where: { id: userId },
      data: { learningPreferences: json(value) },
    });
    return value;
  }
  async start(userId: number, dto: PlacementPreferencesDto) {
    return this.prisma.$transaction(
      async (db) => {
        await this.lock(db, userId);
        await this.expire(db, userId);
        const active = await db.placementAttempt.findFirst({
          where: { userId, status: 'ACTIVE' },
        });
        if (active) return this.view(active, db);
        const pool = await this.pool(db);
        if (
          !canCompleteBlueprint(pool, [], []) ||
          !adjustableParts(pool).length
        )
          throw new ServiceUnavailableException(
            'Chưa đủ ngân hàng câu hỏi và mức khó cho bài đánh giá thích ứng.',
          );
        const previous = await db.placementAttempt.findMany({
          where: { userId },
          orderBy: { startedAt: 'desc' },
          take: 10,
        });
        const seed = randomUUID();
        const first = selectPlacementGroup(
          pool,
          [],
          [],
          seed,
          previous.map(groups),
        );
        if (!first)
          throw new ServiceUnavailableException('Chưa có câu hỏi phù hợp.');
        const value = { goal: dto.goal, targetScore: dto.targetScore ?? null };
        await db.user.update({
          where: { id: userId },
          data: { learningPreferences: json(value) },
        });
        const attempt = await db.placementAttempt.create({
          data: {
            userId,
            seed,
            policyVersion: POLICY_VERSION,
            ...value,
            issued: json([first]),
            responses: [],
            deadlineAt: new Date(Date.now() + 40 * 60 * 1000),
          },
        });
        return this.view(attempt, db);
      },
      { timeout: 15000 },
    );
  }
  async get(userId: number, id: number) {
    return this.prisma.$transaction(async (db) => {
      await this.lock(db, userId);
      await this.expire(db, userId);
      const attempt = await db.placementAttempt.findFirst({
        where: { id, userId },
      });
      if (!attempt) throw new NotFoundException('Không tìm thấy bài đánh giá.');
      return this.view(attempt, db);
    });
  }
  async answer(userId: number, id: number, dto: SubmitPlacementDto) {
    return this.prisma.$transaction(
      async (db) => {
        await this.lock(db, userId);
        await this.expire(db, userId);
        const attempt = await db.placementAttempt.findFirst({
          where: { id, userId },
        });
        if (!attempt)
          throw new NotFoundException('Không tìm thấy bài đánh giá.');
        const issued = groups(attempt),
          past = responses(attempt);
        const requested = issued[dto.revision];
        if (dto.revision < attempt.revision && requested) {
          const prior = past.filter((r) => r.groupKey === requested.key);
          if (
            prior.length === dto.answers.length &&
            new Set(dto.answers.map((a) => a.questionId)).size ===
              prior.length &&
            dto.answers.every((a) =>
              prior.some(
                (r) =>
                  r.questionId === a.questionId &&
                  r.selectedAnswer === a.selectedAnswer,
              ),
            )
          )
            return this.view(attempt, db);
        }
        if (attempt.status !== 'ACTIVE') return this.view(attempt, db);
        if (dto.revision !== attempt.revision)
          throw new ConflictException(
            'Bài đánh giá đã thay đổi ở tab khác. Tải lại để tiếp tục.',
          );
        const current = issued.at(-1)!;
        if (
          dto.answers.length !== current.questions.length ||
          new Set(dto.answers.map((a) => a.questionId)).size !==
            current.questions.length ||
          dto.answers.some(
            (a) =>
              !current.questions.some((q) => q.id === a.questionId) ||
              !/^[ABCD]$/.test(a.selectedAnswer),
          )
        )
          throw new BadRequestException(
            'Cần trả lời đúng các câu trong nhóm hiện tại.',
          );
        if (
          current.part === 2 &&
          dto.answers.some((a) => a.selectedAnswer === 'D')
        )
          throw new BadRequestException('Part 2 chỉ có ba phương án.');
        // The current snapshot is authoritative for grading. A bank edit must not
        // send old responses into the new item's DAS3H history through the outbox.
        const live = await db.question.findMany({
          where: { id: { in: current.questions.map((q) => q.id) } },
          select: bankSelect,
        });
        if (
          current.questions.some(
            (q) =>
              !live.some(
                (l) =>
                  l.id === q.id &&
                  snapshotFingerprint(l) === snapshotFingerprint(q),
              ),
          )
        ) {
          const expired = await db.placementAttempt.update({
            where: { id },
            data: { status: 'EXPIRED', completedAt: new Date() },
          });
          return this.view(expired, db);
        }
        const occurredAt = new Date();
        if (current.part <= 4) {
          const planned = buildListeningPlan('CUSTOM', current.questions);
          const issuedAt =
            past.at(-1)?.occurredAt ?? attempt.startedAt.toISOString();
          if (
            planned &&
            occurredAt.getTime() - Date.parse(issuedAt) <
              planned.targetSeconds * 1000 - 1000
          )
            throw new BadRequestException(
              'Hãy nghe hết audio và thời gian trả lời trước khi chuyển nhóm.',
            );
        }
        const fresh: PlacementResponse[] = current.questions.map((q) => ({
          questionId: q.id,
          selectedAnswer: dto.answers.find((a) => a.questionId === q.id)!
            .selectedAnswer,
          isCorrect:
            dto.answers.find((a) => a.questionId === q.id)!.selectedAnswer ===
            q.correctAnswer,
          groupKey: current.key,
          part: q.part,
          occurredAt: occurredAt.toISOString(),
        }));
        const all = [...past, ...fresh];
        const previous = await db.placementAttempt.findMany({
          where: { userId, id: { not: id } },
          orderBy: { startedAt: 'desc' },
          take: 10,
        });
        const next = selectPlacementGroup(
          await this.pool(db),
          issued,
          all,
          attempt.seed,
          previous.map(groups),
        );
        const complete = !next;
        const result = complete ? placementResult(issued, all) : undefined;
        const saved = await db.placementAttempt.update({
          where: { id },
          data: {
            revision: { increment: 1 },
            responses: json(all),
            issued: json(next ? [...issued, next] : issued),
            ...(complete
              ? {
                  status: 'COMPLETED',
                  completedAt: occurredAt,
                  result: json(result),
                }
              : {}),
          },
        });
        await db.masteryOutbox.createMany({
          data: fresh.map((r) => {
            const q = current.questions.find((q) => q.id === r.questionId)!;
            return {
              id: `placement-${id}-${q.id}`,
              payload: json({
                userId,
                questionId: q.id,
                isCorrect: r.isCorrect,
                occurredAt: r.occurredAt,
                itemDifficulty: q.itemDifficulty,
                skillIds: q.skills.map((s) => s.skillId),
              }),
            };
          }),
          skipDuplicates: true,
        });
        return this.view(saved, db);
      },
      { timeout: 15000 },
    );
  }
  private async reference(
    attempt: PlacementAttempt,
    db: Prisma.TransactionClient,
  ) {
    const userId = attempt.userId;
    const observedAt = (
      attempt.completedAt ?? attempt.deadlineAt
    ).toISOString();
    // State immediately AFTER the final same-timestamp response group. Future
    // practice must never rewrite a past assessment's forecast.
    const cutoff = new Date(Date.parse(observedAt) + 1);
    const note =
      'Chỉ số nội bộ từ DAS3H trên bộ câu tham chiếu, không phải điểm TOEIC, CEFR hay số câu đúng đã quan sát. Chỉ so sánh cùng phiên bản bộ tham chiếu. Bộ này có thể chứa câu đã gặp.';
    const queued = await db.masteryOutbox.findMany({
      where: {
        processedAt: null,
        payload: { path: ['userId'], equals: userId },
      },
      select: { payload: true, createdAt: true },
    });
    if (
      queued.some(
        (e) =>
          Date.parse(
            String(
              (e.payload as { occurredAt?: string })?.occurredAt ??
                e.createdAt.toISOString(),
            ),
          ) < cutoff.getTime(),
      )
    )
      return {
        status: 'pending',
        observedAt,
        note: 'Kết quả đang được đồng bộ vào DAS3H. Hãy tải lại chỉ số sau ít giây.',
      };
    try {
      const model = this.fittedModel();
      if (!model)
        return {
          status: 'unavailable',
          note: 'Chưa có model DAS3H đã huấn luyện để tính chỉ số tham chiếu.',
        };
      const bank = await db.question.findMany({
        select: modelQuestionSelect,
        orderBy: { id: 'asc' },
      });
      const eligible = bank.filter((q) => {
        const source = sourceQuestionId(q);
        const invalidated =
          (q.stimulus as { _trainedItemInvalidated?: boolean } | null)
            ?._trainedItemInvalidated === true;
        return (
          !invalidated &&
          !!source &&
          !!model.questions[source] &&
          model.applicationBridge[source] === questionFingerprint(q)
        );
      });
      const reference = Object.keys(QUOTAS)
        .map(Number)
        .flatMap((part) =>
          eligible.filter((q) => q.part === part).slice(0, 10),
        );
      if (!reference.length)
        return {
          status: 'unavailable',
          note: 'Ngân hàng hiện tại chưa có câu tham chiếu được model xác minh.',
        };
      const predicted = await new TrainedDas3h(db).predictMany(
        userId,
        reference.map((q) => q.id),
        cutoff,
        db,
      );
      if (predicted.size !== reference.length)
        return {
          status: 'unavailable',
          note: 'Độ phủ model đã thay đổi; chưa thể tính chỉ số tham chiếu nhất quán.',
        };
      const expected = (ids: number[]) =>
        Math.round(ids.reduce((n, id) => n + predicted.get(id)!, 0) * 100) /
        100;
      return {
        status: 'ready',
        observedAt,
        note,
        version: snapshotFingerprint([
          model.version,
          reference.map((q) => [q.id, questionFingerprint(q)]),
        ]),
        itemCount: reference.length,
        expectedCorrect: expected(reference.map((q) => q.id)),
        byPart: Object.keys(QUOTAS)
          .map(Number)
          .map((part) => {
            const ids = reference
              .filter((q) => q.part === part)
              .map((q) => q.id);
            return {
              part,
              itemCount: ids.length,
              expectedCorrect: expected(ids),
            };
          }),
      };
    } catch {
      return {
        status: 'unavailable',
        note: 'Chưa xác minh được chỉ số tham chiếu. Kết quả trả lời sơ bộ vẫn được giữ lại.',
      };
    }
  }
  private async view(attempt: PlacementAttempt, db: Prisma.TransactionClient) {
    const current =
      attempt.status === 'ACTIVE' ? groups(attempt).at(-1) : undefined;
    const plan =
      current && current.part <= 4
        ? buildListeningPlan('CUSTOM', current.questions)
        : undefined;
    return {
      id: attempt.id,
      status: attempt.status,
      revision: attempt.revision,
      answeredCount: responses(attempt).length,
      minQuestions: MIN_QUESTIONS,
      maxQuestions: MAX_QUESTIONS,
      deadlineAt: attempt.deadlineAt,
      goal: attempt.goal,
      targetScore: attempt.targetScore,
      policyVersion: attempt.policyVersion,
      limitations: [
        ...LIMITATIONS,
        'Độ khó tương đối dựa trên model đã fit ở câu được xác minh; câu chưa được hỗ trợ giữ nhãn nguồn và có thể chưa điều chỉnh được độ khó.',
      ],
      currentGroup: current
        ? {
            key: current.key,
            part: current.part,
            restSeconds: plan?.groups[0]?.restSeconds ?? 0,
            questions: current.questions.map((q) => ({
              id: q.id,
              part: q.part,
              content: q.part <= 2 ? 'Nghe và chọn đáp án.' : q.content,
              optionA: q.part <= 2 ? 'A' : q.optionA,
              optionB: q.part <= 2 ? 'B' : q.optionB,
              optionC: q.part <= 2 ? 'C' : q.optionC,
              optionD: q.part === 1 ? 'D' : q.part === 2 ? '' : q.optionD,
              passage: q.part <= 4 ? null : q.passage,
              audioUrl: q.audioUrl,
              imageUrl: q.imageUrl,
              stimulus: publicStimulus(q.stimulus, q.part <= 4),
            })),
          }
        : null,
      result: attempt.result ?? null,
      ...(attempt.status === 'COMPLETED'
        ? { reference: await this.reference(attempt, db) }
        : {}),
    };
  }
}
