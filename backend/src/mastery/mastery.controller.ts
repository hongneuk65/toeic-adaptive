import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MasteryService } from './mastery.service';
import { getUserId } from '../common/user-id';

@Controller('mastery')
@UseGuards(AuthGuard('jwt'))
export class MasteryController {
  constructor(private readonly masteryService: MasteryService) {}

  @Get('me')
  async getMyMastery(@Req() req: any) {
    return this.masteryService.getUserMasteryProfile(
      getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.'),
    );
  }
}