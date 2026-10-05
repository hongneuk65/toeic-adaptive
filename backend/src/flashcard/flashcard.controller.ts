import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FlashcardService } from './flashcard.service';
import { getOptionalUserId, getUserId } from '../common/user-id';

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
        userId = getOptionalUserId(payload);
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
    return this.flashcardService.createFolder(getUserId(req, 'Không tìm thấy thông tin định danh.'), body);
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
        userId = getOptionalUserId(payload);
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
    return this.flashcardService.addCardToFolder(getUserId(req, 'Không tìm thấy thông tin định danh.'), id, body);
  }

   @Delete('folders/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteFolder(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardService.deleteFolder(
      getUserId(req, 'Không xác định được danh tính người dùng.'),
      id,
    );
  }
}