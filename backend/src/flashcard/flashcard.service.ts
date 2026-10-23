import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nextReview } from './review-schedule';
import { createHash, randomUUID } from 'node:crypto';
import { HLR_PRIOR, hlrSchedule, loadHlrModel, normalizeRecall, recallProbability } from './hlr';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';
import { memoryState } from './memory-state';

@Injectable()
export class FlashcardService {
  private readonly hlrModel = loadHlrModel();
  constructor(private readonly prisma: PrismaService) { }

  // 1. Lấy danh sách toàn bộ Folder (Đúng chuẩn schema bảng User chỉ có id và email)
  async getFolders(currentUserId?: number) {
    try {
      const folders = await this.prisma.flashcardFolder.findMany({
        where: { OR: [{ private: false }, { userId: currentUserId ?? -1 }] },
        include: {
          user: {
            select: { id: true, email: true }, // Chỉ select các field có thật trong User
          },
          _count: {
            select: { flashcards: true },
          },
        },
        orderBy: { id: 'desc' },
      });

      return folders.filter(f => f.readingKey !== 'santa-vocabulary-library-v1' || f._count.flashcards > 0).map((f, idx) => {
        // Lấy username từ email (ví dụ: test3@gmail.com -> test3)
        const author = f.user?.email ? f.user.email.split('@')[0] : 'Hệ thống';

        const isOwner = Boolean(
          currentUserId && f.userId && Number(f.userId) === Number(currentUserId),
        );

        return {
          id: f.id,
          name: f.name,
          description: f.description || `Thư mục từ vựng ${f.name}`,
          count: f._count?.flashcards ?? 0,
          authorName: author,
          isOwner,
          code: `FLD-${String(idx + 1).padStart(2, '0')}`,
        };
      });
    } catch (error: any) {
      console.error('❌ LỖI TẠI getFolders():', error);
      throw new InternalServerErrorException(error.message || 'Lỗi truy vấn thư mục');
    }
  }

  // 2. Tạo Folder mới (Không tạo thẻ Welcome)
  async createFolder(userId: number, data: { name: string; description?: string }) {
    try {
      return await this.prisma.flashcardFolder.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim(),
          userId: Number(userId),
        },
      });
    } catch (error: any) {
      console.error('❌ LỖI TẠI createFolder():', error);
      throw new InternalServerErrorException('Không thể tạo thư mục');
    }
  }

  // 3. Chi tiết 1 Folder
  async getFolderDetail(folderId: number, currentUserId?: number) {
    const folder = await this.prisma.flashcardFolder.findUnique({
      where: { id: folderId },
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { flashcards: true } },
      },
    });

    if (!folder || (folder.private && folder.userId !== currentUserId)) {
      throw new NotFoundException('Thư mục không tồn tại');
    }

    const author = folder.user?.email ? folder.user.email.split('@')[0] : 'Hệ thống';

    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      count: folder._count?.flashcards ?? 0,
      authorName: author,
      isOwner: Boolean(currentUserId && folder.userId === currentUserId),
    };
  }

  // 4. Lấy danh sách từ trong Folder
  async getCardsByFolder(folderId: number, currentUserId?: number) {
    await this.getFolderDetail(folderId, currentUserId);
    return this.prisma.flashcard.findMany({
      where: { folderId },
      orderBy: { id: 'desc' },
    });
  }
  async reviews(userId: number, folderId: number) {
    await this.getFolderDetail(folderId, userId);
    const rows = await this.prisma.flashcardReview.findMany({ where: { userId, card: { folderId } },
      include: { card: { select: { word: true, meaning: true } } } });
    const now = new Date();
    return rows.map(row => ({ cardId: row.cardId, known: row.known, reviewCount: row.reviewCount,
      intervalDays: row.intervalDays, dueAt: row.dueAt, schedulingSource: row.schedulingSource,
      memory: memoryState(row, row.card, this.hlrModel, now) }));
  }
  async review(userId: number, cardId: number, known: boolean, input: Partial<ReviewFlashcardDto> = {}) {
    const mode = input.recallMode ?? 'self_report';
    if (mode === 'typed' && (input.response === undefined || !input.attemptId)) throw new BadRequestException('Lượt tự nhớ cần câu trả lời và mã lượt ôn.');
    const card = await this.prisma.flashcard.findUnique({ where: { id: cardId } });
    if (!card?.folderId) throw new NotFoundException('Không tìm thấy thẻ.');
    await this.getFolderDetail(card.folderId, userId);
    const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const contentHash = digest([card.word, card.meaning]);
    const requestHash = digest([cardId, mode, mode === 'typed' ? normalizeRecall(input.response ?? '') : known, input.elapsedMs ?? null]);
    const attemptId = input.attemptId ?? randomUUID();
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::bigint)`;
      const event = await tx.flashcardRecallEvent.findUnique({ where: { attemptId }, include: { review: { select: { userId: true } } } });
      if (event) {
        if (event.review.userId !== userId || event.requestHash !== requestHash) throw new ConflictException('Mã lượt ôn đã được dùng cho câu trả lời khác.');
        return event.result;
      }
      const previous = await tx.flashcardReview.findUnique({ where: { userId_cardId: { userId, cardId } } });
      // Transport retries and repeated presses within one minute are the same review.
      if (!input.attemptId && previous?.known === known && Date.now() - previous.updatedAt.getTime() < 60000) return previous;
      const now = new Date();
      const sameContent = previous?.contentHash === contentHash;
      const wins = sameContent ? previous.recallWins : 0;
      const losses = sameContent ? previous.recallLosses : 0;
      // Self-reported exposure has unknown retrieval evidence: restart the training lag.
      const lagDays = sameContent && previous.lastPracticedAt && previous.schedulingSource !== 'fixed-interval' ? Math.max(0, (now.getTime() - previous.lastPracticedAt.getTime()) / 86400000) : 0;
      const correct = mode === 'typed' ? normalizeRecall(input.response ?? '') === normalizeRecall(card.word) : known;
      const typed = mode === 'typed';
      const recallWins = wins + (typed && correct ? 1 : 0);
      const recallLosses = losses + (typed && !correct ? 1 : 0);
      const model = this.hlrModel ?? HLR_PRIOR;
      const schedulingSource = typed ? this.hlrModel ? `hlr-trained:${model.version}` : 'hlr-prior-experimental' : 'fixed-interval';
      const schedule = typed ? hlrSchedule(model, recallWins, recallLosses, correct, now) : nextReview(correct, previous?.intervalDays ?? 0, now);
      const state = { known: correct, ...schedule, recallWins, recallLosses, contentHash, schedulingSource, lastPracticedAt: now };
      const result = await tx.flashcardReview.upsert({ where: { userId_cardId: { userId, cardId } }, create: { userId, cardId, reviewCount: 1, ...state }, update: { reviewCount: { increment: 1 }, ...state } });
      await tx.flashcardRecallEvent.create({ data: { reviewId: result.id, attemptId, requestHash, contentHash, recallMode: mode, correct, elapsedMs: input.elapsedMs, lagDays, priorWins: wins, priorLosses: losses, predictedRecall: typed && lagDays > 0 ? recallProbability(model, wins, losses, lagDays) : null, schedulingSource, result: JSON.parse(JSON.stringify(result)), occurredAt: now } });
      return result;
    });
  }

  // 5. Thêm từ vào Folder (Kiểm tra quyền sở hữu)
  async addCardToFolder(userId: number, folderId: number, data: any) {
    const folder = await this.prisma.flashcardFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException('Thư mục không tồn tại');
    }

    if (Number(folder.userId) !== Number(userId)) {
      throw new ForbiddenException('Bạn không có quyền thêm từ vào thư mục của người khác.');
    }

    return this.prisma.flashcard.create({
      data: {
        userId: Number(userId),
        folderId,
        word: String(data.word).trim(),
        phonetic: data.phonetic ? String(data.phonetic).trim() : undefined,
        meaning: String(data.meaning).trim(),
        example: data.example ? String(data.example).trim() : undefined,
        topic: folder.name,
      },
    });
  }

  async deleteFolder(userId: number, folderId: number) {
    // 1. Kiểm tra folder có tồn tại không
    const folder = await this.prisma.flashcardFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new NotFoundException('Thư mục không tồn tại.');
    }

    // 2. Bắt buộc kiểm tra quyền sở hữu (Quy tắc số 8)
    if (Number(folder.userId) !== Number(userId)) {
      throw new ForbiddenException('Bạn không có quyền xóa thư mục của người khác.');
    }

    // 3. Xóa các thẻ flashcard thuộc folder trước (đảm bảo sạch DB kể cả khi chưa set cascade)
    await this.prisma.flashcard.deleteMany({
      where: { folderId },
    });

    // 4. Xóa folder
    return this.prisma.flashcardFolder.delete({
      where: { id: folderId },
    });
  }
}
