import { publicStimulus } from './public-stimulus';
import { learnerExplanation } from '../common/learner-explanation';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamAttempt, Prisma } from '@prisma/client';
import { questionSelect } from '../common/question-select';
import { importedQuestions } from '../common/imported-questions';
import { selectQuestionGroups } from './select-question-groups';
import { buildListeningPlan } from './listening-plan';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { EXAM_COUNTS, examCounts } from './exam-counts';

@Injectable()
export class ExamService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly masteryQueueService: MasteryQueueService,
  ) {}

  async startExam(userId: number, dto: StartExamDto) {
    examCounts(dto.examType, dto.parts);
    const selectedParts = dto.examType === 'CUSTOM' ? [...dto.parts!].sort((a, b) => a - b) : [];
    const questions = await this.selectQuestions(dto.examType, dto.parts);
    const startedAt = new Date();
    const deadlineAt = this.deadline(dto.examType, selectedParts, questions, startedAt);
    const attempt = await this.prisma.examAttempt.create({
      data: { userId, examType: dto.examType, selectedParts, questionIds: questions.map((q) => q.id), startedAt, deadlineAt,
        questionSnapshot: JSON.parse(JSON.stringify(questions)) as Prisma.InputJsonValue },
    });
    return this.toExamResponse(attempt, questions);
  }

  async catalog() {
    const counts = await this.prisma.question.groupBy({ by: ['part'], where: importedQuestions, _count: { _all: true } });
    const byPart = Array.from({ length: 7 }, (_, i) => ({ part: i + 1, count: counts.find(c => c.part === i + 1)?._count._all || 0 }));
    return { source: 'SANTA_EDNET', totalQuestions: byPart.reduce((sum, p) => sum + p.count, 0), byPart,
      modes: Object.entries(EXAM_COUNTS).map(([examType, requirements]) => ({ examType,
        available: requirements.every((n, i) => byPart[i].count >= n), questionCount: requirements.reduce((sum, n) => sum + n, 0) })) };
  }

  private async selectQuestions(examType: string, parts?: number[]) {
    const counts = examCounts(examType, parts);
    const groups = await Promise.all(counts.map(async (count, index) => {
      if (!count) return [];
      const candidates = await this.prisma.question.findMany({
        where: { part: index + 1, ...importedQuestions }, orderBy: { id: 'asc' }, select: { ...questionSelect, itemDifficulty: true, correctAnswer: true, explanation: true, skills: { select: { skillId: true } } },
      });
      const questions = selectQuestionGroups(candidates, count, index + 1);
      if (questions.length !== count) {
        throw new BadRequestException(`Part ${index + 1} chưa đủ nhóm câu hỏi nguồn crawl để tạo đề ${count} câu`);
      }
      return questions;
    }));
    return groups.flat();
  }

  async getExam(userId: number, attemptId: number) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    if (attempt.submittedAt) return { ...this.toExamResponse(attempt, []), submittedAt: attempt.submittedAt };
    this.assertOpen(attempt);
    const questions = await this.questionsFor(attempt);
    return this.toExamResponse(attempt, questions);
  }

  private toExamResponse(attempt: ExamAttempt, questions: unknown[]) {
    return {
      draftAnswers: attempt.draftAnswers ?? [], draftRevision: attempt.draftRevision ?? 0,
      deadlineAt: attempt.deadlineAt ?? this.deadline(attempt.examType, attempt.selectedParts, questions as Snapshot[], attempt.startedAt),
      submittedAt: attempt.submittedAt,
      attemptId: attempt.id, examType: attempt.examType, selectedParts: attempt.selectedParts ?? [], startedAt: attempt.startedAt,
      listeningPlan: buildListeningPlan(attempt.examType, questions as Parameters<typeof buildListeningPlan>[1]),
      totalQuestions: questions.length, questions: questions.map(question => {
        const source = question as Record<string, unknown>;
        const q = Object.fromEntries(Object.keys(questionSelect).map(key => [key, source[key]]));
        q.stimulus = publicStimulus(q.stimulus, q.part === 1 || q.part === 2);
        // Photo/response questions are heard on the recording, never displayed as transcripts.
        if (q.part === 1 || q.part === 2) return { ...q, content: '', passage: null,
          optionA: 'A', optionB: 'B', optionC: 'C', optionD: q.part === 2 ? '' : 'D' };
        return q;
      }),
    };
  }

  private async getOwnedAttempt(userId: number, id: number) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id } });
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt thi');
    if (attempt.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập bài thi này');
    return attempt;
  }

  private assertOpen(attempt: ExamAttempt) {
    if (attempt.submittedAt) throw new BadRequestException('Bài thi này đã được nộp trước đó');
    if (!attempt.questionIds.length) {
      throw new BadRequestException('Lượt thi cũ chưa lưu danh sách câu hỏi. Vui lòng tạo lượt thi mới.');
    }
  }

  async submitExam(userId: number, dto: SubmitExamDto) {
    const attempt = await this.getOwnedAttempt(userId, dto.attemptId);
    if (attempt.submittedAt) return this.submissionResult(attempt);
    this.assertOpen(attempt);
    this.validateAnswers(attempt, dto.answers);
    const questions = await this.questionsFor(attempt);
    const deadline = attempt.deadlineAt ?? this.deadline(attempt.examType, attempt.selectedParts, questions, attempt.startedAt);
    const answers = Date.now() > deadline.getTime() ? this.draft(attempt) : dto.answers;
    const selected = new Map(answers.map(a => [a.questionId, a.selectedAnswer]));
    const byId = new Map(questions.map((q) => [q.id, q]));
    const records = attempt.questionIds.map((questionId) => ({
      attemptId: attempt.id, questionId, selectedAnswer: selected.get(questionId) ?? '',
      isCorrect: selected.get(questionId) === byId.get(questionId)!.correctAnswer,
    }));
    const listeningCorrect = records.filter((a) => a.isCorrect && byId.get(a.questionId)!.part <= 4).length;
    const totalCorrect = records.filter((a) => a.isCorrect).length;
    const readingCorrect = totalCorrect - listeningCorrect;
    const counts = examCounts(attempt.examType, attempt.examType === 'CUSTOM' ? attempt.selectedParts : undefined);
    const listeningScore = this.scaleScore(listeningCorrect, counts.slice(0, 4));
    const readingScore = this.scaleScore(readingCorrect, counts.slice(4));
    const scores = { listeningScore, readingScore, totalScore: listeningScore + readingScore };

    const submittedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.examAttempt.updateMany({
        where: { id: attempt.id, submittedAt: null },
        data: { submittedAt, ...scores },
      });
      if (!claimed.count) return;
      await tx.examAnswer.createMany({ data: records });
      const events = records.filter(a => a.selectedAnswer).map(a => ({
        id: `exam-${attempt.id}-${a.questionId}`,
        payload: { userId, questionId: a.questionId, isCorrect: a.isCorrect, occurredAt: submittedAt.toISOString(), itemDifficulty: byId.get(a.questionId)!.itemDifficulty,
          skillIds: byId.get(a.questionId)!.skills.map(s => s.skillId) } as Prisma.InputJsonValue,
      }));
      if (events.length) await tx.masteryOutbox.createMany({ data: events, skipDuplicates: true });
    });
    const saved = await this.getOwnedAttempt(userId, attempt.id);
    if (saved.submittedAt) return this.submissionResult(saved);
    return { attemptId: attempt.id, listeningCorrect, readingCorrect, totalCorrect, ...scores };
  }

  private scaleScore(correct: number, counts: number[]) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    return total ? Math.round(correct / total * 495) : 0;
  }

  async getReview(userId: number, attemptId: number) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    if (!attempt.submittedAt) throw new BadRequestException('Bạn cần nộp bài trước khi xem đáp án');
    const answers = await this.prisma.examAnswer.findMany({ where: { attemptId }, orderBy: { id: 'asc' } });
    const questions = await this.questionsFor(attempt);
    const byId = new Map(questions.map(q => [q.id, q]));
    const { questionSnapshot: _snapshot, draftAnswers: _draft, ...publicAttempt } = attempt;
    return { ...publicAttempt, answers: answers.map(answer => {
      const question = byId.get(answer.questionId)!;
      return { ...answer, question: { ...question, explanation: learnerExplanation(question.explanation) } };
    }) };
  }

  private draft(attempt: ExamAttempt): {questionId: number; selectedAnswer: string}[] {
    return Array.isArray(attempt.draftAnswers) ? attempt.draftAnswers as unknown as {questionId: number; selectedAnswer: string}[] : [];
  }

  private validateAnswers(attempt: ExamAttempt, answers: {questionId: number; selectedAnswer: string}[]) {
    if (new Set(answers.map(a => a.questionId)).size !== answers.length || answers.some(a => !attempt.questionIds.includes(a.questionId) || !/^[ABCD]$/.test(a.selectedAnswer)))
      throw new BadRequestException('Danh sách đáp án bị trùng hoặc chứa câu hỏi ngoài đề');
  }

  async saveDraft(userId: number, id: number, dto: {revision: number; answers: {questionId: number; selectedAnswer: string}[]}) {
    const attempt = await this.getOwnedAttempt(userId, id);
    this.assertOpen(attempt);
    this.validateAnswers(attempt, dto.answers);
    const deadline = attempt.deadlineAt ?? this.deadline(attempt.examType, attempt.selectedParts, await this.questionsFor(attempt), attempt.startedAt);
    if (Date.now() >= deadline.getTime()) throw new BadRequestException('Đã hết thời gian làm bài; nộp bài để chấm bản nháp đã lưu.');
    const savedAt = new Date();
    const saved = await this.prisma.examAttempt.updateMany({
      where: { id, submittedAt: null, draftRevision: dto.revision - 1, deadlineAt: { gt: savedAt } },
      data: { draftAnswers: dto.answers, draftRevision: dto.revision },
    });
    if (!saved.count) throw new ConflictException('Bản nháp đã thay đổi. Vui lòng tải lại bài thi.');
    return { draftRevision: dto.revision, savedAt };
  }

  private async questionsFor(attempt: ExamAttempt): Promise<Snapshot[]> {
    if (Array.isArray(attempt.questionSnapshot)) return attempt.questionSnapshot as unknown as Snapshot[];
    // Compatibility for old fixtures; deployed legacy attempts are frozen by the migration.
    const questions = await this.prisma.question.findMany({ where: { id: { in: attempt.questionIds } }, select: { ...questionSelect, itemDifficulty: true, correctAnswer: true, explanation: true, skills: {select: {skillId: true}} } });
    if (questions.length !== attempt.questionIds.length) throw new BadRequestException('Câu hỏi trong đề không còn đầy đủ');
    const byId = new Map(questions.map(q => [q.id, q]));
    return attempt.questionIds.map(id => byId.get(id)!);
  }

  private deadline(type: string, parts: number[], questions: readonly {id:number;part:number;audioUrl?:string|null;stimulus?:unknown}[], start: Date) {
    const plan = buildListeningPlan(type, questions);
    const minutes = ({ FULL: 120, MINI: 60, PART_5: 20 } as Record<string, number>)[type];
    const seconds = type === 'CUSTOM' ? (plan?.targetSeconds ?? questions.filter(q => q.part <= 4).length * 27) + parts.reduce((sum, part) => sum + ([0,0,0,0,0,20,10,45][part] || 0) * 60, 0)
      : plan && (type === 'FULL' || type === 'MINI') ? plan.targetSeconds + (type === 'FULL' ? 75 * 60 : 37.5 * 60) : minutes * 60;
    return new Date(start.getTime() + seconds * 1000);
  }

  private async submissionResult(attempt: ExamAttempt) {
    const answers = await this.prisma.examAnswer.findMany({ where: {attemptId: attempt.id} });
    const byId = new Map((await this.questionsFor(attempt)).map(q => [q.id, q]));
    const totalCorrect = answers.filter(a => a.isCorrect).length;
    const listeningCorrect = answers.filter(a => a.isCorrect && (byId.get(a.questionId)?.part ?? 5) <= 4).length;
    return { attemptId: attempt.id, submittedAt: attempt.submittedAt, listeningCorrect,
      readingCorrect: totalCorrect - listeningCorrect, totalCorrect, listeningScore: attempt.listeningScore,
      readingScore: attempt.readingScore, totalScore: attempt.totalScore };
  }
}

type Snapshot = Prisma.QuestionGetPayload<{select: typeof questionSelect & {itemDifficulty: true; correctAnswer: true; explanation: true; skills: {select: {skillId:true}}}}>;
