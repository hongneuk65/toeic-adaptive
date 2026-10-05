import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RetrievedChunk {
  id: number;
  title: string;
  category: string;
  part: number;
  skillCode?: string | null;
  content: string;
  relevanceScore: number;
  sourceType: 'chunk' | 'lesson';
  lessonId?: number | null;
}

@Injectable()
export class RagRetrieverService {
  private readonly logger = new Logger(RagRetrieverService.name);
  // Cache only public knowledge, never learner data or personalized answers.
  private readonly candidates = new Map<number, {
    expiresAt: number;
    pending: ReturnType<RagRetrieverService['loadCandidates']>;
  }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Truy xuất các mẩu tri thức liên quan nhất (Hybrid Retrieval)
   */
  async retrieveContext(params: {
    query: string;
    part?: number;
    skillCode?: string;
    topK?: number;
  }): Promise<RetrievedChunk[]> {
    const { query, part, skillCode, topK = 3 } = params;
    const tokens = this.tokenize(query);

    const [candidateChunks, candidateLessons] = await this.getCandidates(part);

    const scoredItems: RetrievedChunk[] = [];

    // Chấm điểm candidates từ KnowledgeChunk
    for (const chunk of candidateChunks) {
      let score = 0;

      // Match skill
      if (skillCode && chunk.skillCode === skillCode) {
        score += 50;
      }

      // Match part
      if (part && chunk.part === part) {
        score += 20;
      }

      // Match keywords
      if (chunk.keywords && Array.isArray(chunk.keywords)) {
        for (const kw of chunk.keywords) {
          const lowerKw = kw.toLowerCase();
          for (const token of tokens) {
            if (lowerKw.includes(token) || token.includes(lowerKw)) {
              score += 15;
            }
          }
        }
      }

      // Token overlap in title & content
      const lowerTitle = chunk.title.toLowerCase();
      const lowerContent = chunk.content.toLowerCase();
      for (const token of tokens) {
        if (lowerTitle.includes(token)) score += 8;
        if (lowerContent.includes(token)) score += 3;
      }

      scoredItems.push({
        id: chunk.id,
        title: chunk.title,
        category: chunk.category,
        part: chunk.part,
        skillCode: chunk.skillCode,
        content: chunk.content.substring(0, 2400),
        relevanceScore: score,
        sourceType: 'chunk',
        lessonId: chunk.lessonId,
      });
    }

    // Chấm điểm candidates từ TheoryLesson
    for (const lesson of candidateLessons) {
      let score = 0;
      if (skillCode && lesson.skill?.code === skillCode) {
        score += 45;
      }
      if (part && lesson.part === part) {
        score += 15;
      }

      const lowerTitle = lesson.title.toLowerCase();
      const lowerContent = lesson.content.toLowerCase();
      for (const token of tokens) {
        if (lowerTitle.includes(token)) score += 7;
        if (lowerContent.includes(token)) score += 2;
      }

      // Chỉ lấy nếu có liên quan
      if (score > 15) {
        scoredItems.push({
          id: lesson.id,
          title: lesson.title,
          category: 'Lesson',
          part: lesson.part,
          skillCode: lesson.skill?.code,
          content: lesson.content.substring(0, 1000) + '...',
          relevanceScore: score,
          sourceType: 'lesson',
          lessonId: lesson.id,
        });
      }
    }

    // Sắp xếp giảm dần theo điểm liên quan và lấy topK
    scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const results = scoredItems.slice(0, topK);

    this.logger.debug(
      `Retrieved ${results.length} chunks for query: "${query.substring(0, 40)}..." (Top score: ${results[0]?.relevanceScore ?? 0})`,
    );

    return results;
  }

  private tokenize(text: string): string[] {
    if (!text) return [];
    return [...new Set(text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2))].slice(0, 80);
  }

  private loadCandidates(part?: number) {
    return Promise.all([
      this.prisma.knowledgeChunk.findMany({
        where: part ? { part } : {},
        select: { id: true, title: true, category: true, part: true, skillCode: true, content: true, keywords: true, lessonId: true },
      }),
      this.prisma.theoryLesson.findMany({
        where: part ? { part } : undefined,
        select: { id: true, title: true, part: true, content: true, skill: { select: { code: true } } },
      }),
    ]);
  }

  private getCandidates(part?: number) {
    const key = part || 0;
    const cached = this.candidates.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.pending;
    if (this.candidates.size >= 16) this.candidates.delete(this.candidates.keys().next().value!);
    const pending = this.loadCandidates(part);
    const entry = { expiresAt: Date.now() + 60000, pending };
    this.candidates.set(key, entry);
    void pending.catch(() => {
      if (this.candidates.get(key) === entry) this.candidates.delete(key);
    });
    return pending;
  }
}
