import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
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
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FlashcardService } from './flashcard.service';
import { getUserId } from '../common/user-id';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';
import { CreateFlashcardDto, CreateFolderDto } from './dto/create-flashcard.dto';

@Controller('flashcards')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}
  @Get('folders/:id/reviews')
  @UseGuards(AuthGuard('jwt'))
  reviews(@Req() req: any, @Param('id', ParseIntPipe) id: number) { return this.flashcardService.reviews(getUserId(req), id); }
  @Patch('cards/:id/review')
  @UseGuards(AuthGuard('jwt'))
  review(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewFlashcardDto) { return this.flashcardService.review(getUserId(req), id, dto.known, dto); }

  // 1. Xem danh sách Folder (Công khai, tự nhận diện token nếu có)
  @Get('folders')
  @UseGuards(AuthGuard('jwt'))
  async getFolders(@Req() req: any) {
    return this.flashcardService.getFolders(getUserId(req));
  }

  // 2. Tạo Folder mới (Yêu cầu đăng nhập, unwrap userId an toàn)
  @Post('folders')
  @UseGuards(AuthGuard('jwt'))
  async createFolder(
    @Req() req: any,
    @Body() body: CreateFolderDto,
  ) {
    return this.flashcardService.createFolder(getUserId(req, 'Không tìm thấy thông tin định danh.'), body);
  }

  // 3. Chi tiết 1 Folder
  @Get('folders/:id')
  @UseGuards(AuthGuard('jwt'))
  async getFolderDetail(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.flashcardService.getFolderDetail(id, getUserId(req));
  }

  // 4. Lấy danh sách từ trong Folder
  @Get('folders/:id/cards')
  @UseGuards(AuthGuard('jwt'))
  async getCards(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.flashcardService.getCardsByFolder(id, getUserId(req));
  }

  // 5. Thêm từ vào Folder (Yêu cầu đăng nhập & kiểm tra quyền)
  @Post('folders/:id/cards')
  @UseGuards(AuthGuard('jwt'))
  async addCard(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateFlashcardDto,
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
