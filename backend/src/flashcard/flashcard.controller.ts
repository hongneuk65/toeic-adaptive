import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  UnauthorizedException,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FlashcardService } from './flashcard.service';

@Controller('flashcards')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  // 1. Xem danh sách Folder (Công khai, tự nhận diện token nếu có)
  @Get('folders')
  async getFolders(@Req() req: any) {
    let userId: number | undefined;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        userId = payload.userId || payload.sub || payload.id;
      } catch {}
    }
    return this.flashcardService.getFolders(userId ? Number(userId) : undefined);
  }

  // 2. Tạo Folder mới (Yêu cầu đăng nhập, unwrap userId an toàn)
  @Post('folders')
  @UseGuards(AuthGuard('jwt'))
  async createFolder(
    @Req() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin định danh.');
    }
    return this.flashcardService.createFolder(Number(userId), body);
  }

  // 3. Chi tiết 1 Folder
  @Get('folders/:id')
  async getFolderDetail(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    let userId: number | undefined;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        userId = payload.userId || payload.sub || payload.id;
      } catch {}
    }
    return this.flashcardService.getFolderDetail(id, userId ? Number(userId) : undefined);
  }

  // 4. Lấy danh sách từ trong Folder
  @Get('folders/:id/cards')
  async getCards(@Param('id', ParseIntPipe) id: number) {
    return this.flashcardService.getCardsByFolder(id);
  }

  // 5. Thêm từ vào Folder (Yêu cầu đăng nhập & kiểm tra quyền)
  @Post('folders/:id/cards')
  @UseGuards(AuthGuard('jwt'))
  async addCard(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin định danh.');
    }
    return this.flashcardService.addCardToFolder(Number(userId), id, body);
  }

   @Delete('folders/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteFolder(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    // Lấy userId theo đúng quy ước dự án
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không xác định được danh tính người dùng.');
    }
    return this.flashcardService.deleteFolder(Number(userId), id);
  }
}