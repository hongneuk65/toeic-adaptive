import { Injectable } from '@nestjs/common';
import { RagRetrieverService, RetrievedChunk } from './rag-retriever.service';
import { RagExplainerService, PersonalizedExplanationResult } from './rag-explainer.service';
import { RagChatService, ChatMessageResult } from './rag-chat.service';
import { RagRoadmapService, PersonalizedRoadmapResult } from './rag-roadmap.service';
import { ExplainErrorDto, ChatTutorDto } from './dto/rag.dto';

@Injectable()
export class RagService {
  constructor(
    private readonly retriever: RagRetrieverService,
    private readonly explainer: RagExplainerService,
    private readonly chat: RagChatService,
    private readonly roadmap: RagRoadmapService,
  ) {}

  explainError(userId: number, dto: ExplainErrorDto): Promise<PersonalizedExplanationResult> {
    return this.explainer.explainError({
      userId,
      questionId: dto.questionId,
      selectedAnswer: dto.selectedAnswer,
      userNote: dto.userNote,
      attemptId: dto.attemptId, mode: dto.mode,
    });
  }

  streamExplanation(userId: number, dto: ExplainErrorDto, signal: AbortSignal, onChunk: (chunk: string) => void) {
    return this.explainer.explainError({ userId, ...dto, signal, onChunk });
  }

  authorizeTutor(userId: number, dto?: ExplainErrorDto) { return this.explainer.authorize(userId, dto); }

  chatWithTutor(userId: number, dto: ChatTutorDto): Promise<ChatMessageResult> {
    return this.chat.handleUserMessage({
      userId,
      message: dto.message,
      questionId: dto.questionId,
      skillCode: dto.skillCode,
    });
  }

  streamChatWithTutor(userId: number, dto: ChatTutorDto, signal?: AbortSignal): AsyncGenerator<string> {
    return this.chat.streamUserMessage({
      userId,
      message: dto.message,
      questionId: dto.questionId,
      skillCode: dto.skillCode,
      signal,
    });
  }

  getChatHistory(userId: number): Promise<ChatMessageResult[]> {
    return this.chat.getChatHistory(userId);
  }

  clearChatHistory(userId: number): Promise<{ success: boolean }> {
    return this.chat.clearChatHistory(userId);
  }

  getPersonalizedRoadmap(userId: number): Promise<PersonalizedRoadmapResult> {
    return this.roadmap.getPersonalizedRoadmap(userId);
  }

  searchKnowledge(query: string, part?: number): Promise<RetrievedChunk[]> {
    // GET search is a browse endpoint; it must not bypass POST AI budgets.
    return this.retriever.retrieveContext({ query, part, topK: 5, semantic: false });
  }
}
