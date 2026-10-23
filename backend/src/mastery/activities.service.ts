import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryService } from './mastery.service';
import { topicForLesson, topicForSkill } from './learning-topics';
import { loadHlrModel } from '../flashcard/hlr';
import { memoryState } from '../flashcard/memory-state';
import { learnerStage } from './learner-stage';

export interface LearningActivity {
  id: string; title: string; href: string; reason: string;
  evidence: 'das3h' | 'vocabulary-recall' | 'listening-practice' | 'reading-practice' | 'starter';
  priority: 'focus' | 'review' | 'diagnostic'; dueAt?: string;
}

const readingTypes: Record<string, string[]> = {
  P7A_MAIN_PURPOSE: ['MAIN', 'PURPOSE'], P7A_FACT_NEGATIVE_FACT: ['DETAIL'],
  P7A_INFERENCE_DETAIL: ['INFERENCE'], P7A_VOCAB_SYNONYM: ['PARAPHRASE'],
};
const label: Record<string, string> = { MAIN: 'ý chính', PURPOSE: 'mục đích', DETAIL: 'chi tiết', INFERENCE: 'suy luận', PARAPHRASE: 'diễn đạt tương đương' };
function questions(raw: unknown): { type: string; answer: number }[] {
  return Array.isArray(raw) ? raw.filter(q => q && typeof q.type === 'string' && Number.isInteger(q.answer)) : [];
}

/** Read-only cross-module selection. Native evidence is not injected into DAS3H. */
@Injectable()
export class ActivitiesService {
  private readonly hlr = loadHlrModel();
  constructor(private readonly prisma: PrismaService, private readonly mastery: MasteryService) {}

  async forUser(userId: number) {
    const now = new Date();
    const accessSource = { deletedAt: null, OR: [{ ownerId: userId }, { published: true }] };
    const [profile, lessons, reviews, listening, attempts, articles, vocabularyCatalog, listeningCatalog] = await Promise.all([
      this.mastery.getUserMasteryProfile(userId),
      this.prisma.theoryLesson.findMany({ select: { id: true, title: true, part: true, skillId: true, skill: { select: { code: true } } }, orderBy: { id: 'asc' }, take: 2000 }),
      this.prisma.flashcardReview.findMany({ where: { userId, card: { folder: { OR: [{ userId }, { private: false }] } } },
        include: { card: { select: { word: true, meaning: true, folderId: true, folder: { select: { name: true } } } } },
        orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 500 }),
      this.prisma.listeningAnswer.findMany({ where: { session: { userId, source: accessSource }, mode: { in: ['CLOZE', 'DICTATION'] } },
        select: { unitId: true, score: true, sessionId: true, session: { select: { sourceId: true, source: { select: { title: true } } } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 200 }),
      this.prisma.readingAttempt.findMany({ where: { userId, submittedAt: { not: null } },
        select: { answers: true, versionId: true, version: { select: { articleId: true, questions: true } } },
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }], take: 30 }),
      this.prisma.readingArticle.findMany({ where: { archived: false, OR: [{ ownerId: userId, currentVersionId: { not: null } }, { ownerId: null, publishedVersionId: { not: null } }] },
        select: { id: true, ownerId: true, currentVersionId: true, publishedVersionId: true }, orderBy: { id: 'desc' }, take: 100 }),
      this.prisma.flashcardFolder.findMany({ where: { OR: [{ userId }, { private: false }], flashcards: { some: { reviews: { none: { userId } } } } },
        select: { id: true, name: true, userId: true, _count: { select: { flashcards: { where: { reviews: { none: { userId } } } } } } },
        orderBy: { id: 'asc' }, take: 100 }),
      this.prisma.listeningSource.findMany({ where: { ...accessSource, transcripts: { some: { status: 'READY', language: 'en', units: { some: {} } } } },
        select: { id: true, title: true, transcripts: { where: { status: 'READY', language: 'en', units: { some: {} } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1,
          select: { units: { orderBy: { position: 'asc' }, take: 3, select: { start: true, end: true } } } } },
        orderBy: { id: 'asc' }, take: 100 }),
    ]);
    const guidance = learnerStage(profile.skills);
    const readingGuidance = learnerStage(profile.skills.filter(s => s.part === 7));
    const targetDifficulty = readingGuidance.stage === 'consolidating' ? 'HARD' : readingGuidance.stage === 'developing' ? 'MEDIUM' : 'EASY';
    const versionIds = articles.map(a => a.ownerId === userId ? a.currentVersionId : a.publishedVersionId).filter((id): id is number => id !== null);
    // Fetch only the version actually visible to this user, not every historical draft.
    const versions = versionIds.length ? await this.prisma.readingVersion.findMany({ where: { id: { in: versionIds } },
      select: { id: true, articleId: true, title: true, difficulty: true, questions: true }, take: 100 }) : [];
    const sections: Record<'theory' | 'vocabulary' | 'listening' | 'reading', LearningActivity[]> = { theory: [], vocabulary: [], listening: [], reading: [] };
    const weak = profile.skills.filter(s => s.practiceCount > 0 && s.masteryScore < .65)
      .sort((a, b) => a.masteryScore - b.masteryScore || a.skillId - b.skillId);
    for (const skill of weak) {
      const lesson = lessons.find(l => l.skillId === skill.skillId && topicForLesson(l).id === topicForSkill(skill.skillCode)?.id);
      if (lesson && !sections.theory.some(a => a.id === `theory:${lesson.id}`)) sections.theory.push({
        id: `theory:${lesson.id}`, title: lesson.title, href: `/theory?lesson=${lesson.id}`,
        reason: `Củng cố ${skill.skillName} từ kết quả luyện có gắn kỹ năng.`, evidence: 'das3h', priority: 'focus',
      });
      if (sections.theory.length === 3) break;
    }
    if (!sections.theory.length) {
      const skillMap = new Map(profile.skills.map(s => [s.skillId, s]));
      const eligible = lessons.filter(l => topicForLesson(l).id === topicForSkill(l.skill?.code ?? '')?.id);
      eligible.sort((a, b) => (skillMap.get(a.skillId)?.practiceCount ?? 0) - (skillMap.get(b.skillId)?.practiceCount ?? 0) || a.part - b.part || a.id - b.id);
      sections.theory = eligible.slice(0, 3).map(l => ({ id: `theory:${l.id}`, title: l.title, href: `/theory?lesson=${l.id}`,
        reason: (skillMap.get(l.skillId)?.practiceCount ?? 0) === 0 ? 'Bắt đầu tìm hiểu chủ đề chưa có kết quả luyện; làm quiz sau bài để kiểm tra.' : 'Ôn lại chủ đề đã học và dùng quiz để kiểm tra mức nắm vững hiện tại.',
        evidence: 'starter', priority: 'diagnostic' }));
    }
    const folders = new Map<number, { name: string; due: number; fragile: number; earliest: Date }>();
    for (const row of reviews) {
      if (!row.card.folderId || !row.card.folder) continue;
      const memory = memoryState(row, row.card, this.hlr, now);
      const due = row.dueAt <= now;
      const fragile = memory.probability !== null && memory.probability < .8;
      if (!due) continue;
      const group = folders.get(row.card.folderId) ?? { name: row.card.folder.name, due: 0, fragile: 0, earliest: row.dueAt };
      group.due += Number(due); group.fragile += Number(fragile);
      if (row.dueAt < group.earliest) group.earliest = row.dueAt;
      folders.set(row.card.folderId, group);
    }
    sections.vocabulary = [...folders].sort((a, b) => b[1].due - a[1].due || b[1].fragile - a[1].fragile || a[0] - b[0]).slice(0, 3).map(([id, f]) => ({
      id: `vocabulary:${id}`, title: f.name, href: `/flashcards/${id}`,
      reason: `${f.due} thẻ đến hạn${f.fragile ? `; ${f.fragile} thẻ có ước tính nhớ dưới 80%` : ''}. Lịch ôn từ vựng riêng, không phải điểm DAS3H.`,
      evidence: 'vocabulary-recall', priority: 'review', dueAt: f.earliest.toISOString(),
    }));
    const newFolders = [...vocabularyCatalog].sort((a, b) => Number(b.userId === userId) - Number(a.userId === userId) || a._count.flashcards - b._count.flashcards || a.id - b.id);
    for (const folder of newFolders) {
      if (sections.vocabulary.length >= 3) break;
      if (sections.vocabulary.some(item => item.id === `vocabulary:${folder.id}`)) continue;
      sections.vocabulary.push({ id: `vocabulary:${folder.id}`, title: folder.name, href: `/flashcards/${folder.id}`,
        reason: `Có ${folder._count.flashcards} thẻ chưa luyện. Bắt đầu một nhóm nhỏ bằng chế độ tự nhớ; lịch ôn sẽ cập nhật từ câu trả lời. Chưa có nhãn độ khó được thẩm định cho thư mục này.`,
        evidence: 'starter', priority: 'diagnostic' });
    }
    // Keep only the latest response to each unit; retries must not multiply evidence.
    const seenUnits = new Set<number>();
    const sources = new Map<number, { title: string; count: number; total: number; sessionId: number }>();
    for (const answer of listening) {
      if (seenUnits.has(answer.unitId) || !Number.isFinite(answer.score)) continue;
      seenUnits.add(answer.unitId);
      const id = answer.session.sourceId;
      const group = sources.get(id) ?? { title: answer.session.source.title, count: 0, total: 0, sessionId: answer.sessionId };
      group.count++; group.total += answer.score; sources.set(id, group);
    }
    sections.listening = [...sources].filter(([, s]) => s.count >= 3 && s.total / s.count < .65)
      .sort((a, b) => a[1].total / a[1].count - b[1].total / b[1].count || a[0] - b[0]).slice(0, 3).map(([id, s]) => ({
        id: `listening:${id}`, title: s.title, href: `/listening?session=${s.sessionId}`,
        reason: `Mức khớp văn bản trung bình ${Math.round(s.total / s.count * 100)}% trên ${s.count} đoạn gần đây. Ôn lại nguồn nghe này.`,
        evidence: 'listening-practice', priority: 'focus',
      }));
    if (sections.listening.length < 3) {
      const candidates = listeningCatalog.map(source => ({ source, length: source.transcripts[0]?.units[0] ? source.transcripts[0].units[0].end - source.transcripts[0].units[0].start : Infinity }))
        .filter(c => c.length > 0 && Number.isFinite(c.length)).sort((a, b) => a.length - b.length || a.source.id - b.source.id);
      for (const { source } of candidates) {
        if (sections.listening.length >= 3) break;
        if (sections.listening.some(item => item.id === `listening:${source.id}`)) continue;
        sections.listening.push({ id: `listening:${source.id}`, title: source.title, href: `/listening?source=${source.id}`,
          reason: 'Nguồn có lời thoại sẵn, ưu tiên đoạn đầu ngắn để bắt đầu. Kết quả điền từ hoặc chép lời sẽ giúp chọn bài tiếp theo; độ dài không phải nhãn độ khó.', evidence: 'starter', priority: 'diagnostic' });
      }
    }
    const performance = new Map<string, { count: number; misses: number }>();
    const seenQuestions = new Set<string>();
    for (const attempt of attempts) {
      const qs = questions(attempt.version.questions);
      const answers = attempt.answers && typeof attempt.answers === 'object' && !Array.isArray(attempt.answers) ? attempt.answers as Record<string, { selected?: number }> : {};
      qs.forEach((q, index) => {
        const key = `${attempt.versionId}:${index}`;
        if (seenQuestions.has(key) || !label[q.type] || !Number.isInteger(answers[String(index)]?.selected)) return;
        seenQuestions.add(key);
        const entry = performance.get(q.type) ?? { count: 0, misses: 0 };
        entry.count++; entry.misses += Number(answers[String(index)].selected !== q.answer); performance.set(q.type, entry);
      });
    }
    const weakTypes = [...performance].filter(([, p]) => p.count >= 3 && p.misses / p.count > .35)
      .sort((a, b) => b[1].misses / b[1].count - a[1].misses / a[1].count || a[0].localeCompare(b[0])).map(([type]) => type);
    const dasTypes = [...new Set(weak.flatMap(s => readingTypes[s.skillCode] ?? []))];
    for (const type of new Set([...weakTypes, ...dasTypes])) {
      const candidates = articles.flatMap(a => {
        const version = versions.find(v => v.articleId === a.id && v.id === (a.ownerId === userId ? a.currentVersionId : a.publishedVersionId));
        return version && questions(version.questions).some(q => q.type === type) ? [{ article: a, version }] : [];
      });
      // Prefer a related article not yet completed; still allow revision on small banks.
      candidates.sort((a, b) => Number(b.version.difficulty === targetDifficulty) - Number(a.version.difficulty === targetDifficulty) || Number(attempts.some(t => t.versionId === a.version.id)) - Number(attempts.some(t => t.versionId === b.version.id)) || a.article.id - b.article.id);
      const candidate = candidates.find(c => !sections.reading.some(s => s.id === `reading:${c.article.id}`));
      if (candidate) sections.reading.push({ id: `reading:${candidate.article.id}`, title: candidate.version.title,
        href: `/reading?article=${candidate.article.id}`,
        reason: `Bài có câu hỏi ${label[type]}, liên quan ${weakTypes.includes(type) ? 'dạng bạn còn sai trong các bài Reading đã nộp' : 'kỹ năng cần củng cố trong DAS3H'}.`,
        evidence: weakTypes.includes(type) ? 'reading-practice' : 'das3h', priority: 'focus' });
      if (sections.reading.length === 3) break;
    }
    const readable = articles.flatMap(a => {
      const v = versions.find(v => v.articleId === a.id && v.id === (a.ownerId === userId ? a.currentVersionId : a.publishedVersionId));
      return v && questions(v.questions).length ? [{ article: a, version: v }] : [];
    }).sort((a, b) => Number(b.version.difficulty === targetDifficulty) - Number(a.version.difficulty === targetDifficulty) || Number(attempts.some(t => t.versionId === a.version.id)) - Number(attempts.some(t => t.versionId === b.version.id)) || a.article.id - b.article.id);
    for (const { article, version } of readable) {
      if (sections.reading.length >= 3) break;
      if (sections.reading.some(item => item.id === `reading:${article.id}`)) continue;
      sections.reading.push({ id: `reading:${article.id}`, title: version.title, href: `/reading?article=${article.id}`,
        reason: `Khám phá bài đọc${version.difficulty === targetDifficulty ? ` ở mức ${targetDifficulty === 'EASY' ? 'dễ' : targetDifficulty === 'MEDIUM' ? 'vừa' : 'khó'} trong thư viện` : ' hiện có trong thư viện'}. ${readingGuidance.stage === 'unassessed' ? 'Chưa đủ bằng chứng đọc; ưu tiên mức dễ để bắt đầu.' : 'Mức ưu tiên dựa trên các kỹ năng đọc đã luyện.'} Làm bài để cập nhật gợi ý.`, evidence: 'starter', priority: 'diagnostic' });
    }
    return { generatedAt: now.toISOString(), learnerProfile: guidance, sections };
  }
}
