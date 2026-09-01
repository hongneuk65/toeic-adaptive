import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlashcardService {
  constructor(private readonly prisma: PrismaService) { }

  // 1. Lấy danh sách toàn bộ Folder (Đúng chuẩn schema bảng User chỉ có id và email)
  async getFolders(currentUserId?: number) {
    try {
      const folders = await this.prisma.flashcardFolder.findMany({
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

      return folders.map((f, idx) => {
        // Lấy username từ email (ví dụ: test3@gmail.com -> test3)
        const author = f.user?.email ? f.user.email.split('@') : 'Hệ thống';

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

    if (!folder) {
      throw new NotFoundException('Thư mục không tồn tại');
    }

    const author = folder.user?.email ? folder.user.email.split('@') : 'Hệ thống';

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
  async getCardsByFolder(folderId: number) {
    return this.prisma.flashcard.findMany({
      where: { folderId },
      orderBy: { id: 'desc' },
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