import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { AuthGuard } from '@nestjs/passport';
import { MasteryService } from './mastery.service';
import { getUserId } from '../common/user-id';
import { ActivitiesService } from './activities.service';

@Controller('mastery')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MasteryController {
  constructor(private readonly masteryService: MasteryService, private readonly activities: ActivitiesService, private readonly progress: ProgressService) {}

  @Get('progress')
  getProgress(@Req() req: any, @Query('days') days?: string, @Query('part') part?: string, @Query('difficulty') difficulty?: string) {
    return this.progress.forUser(getUserId(req), days, part, difficulty);
  }

  @Get('activities')
  async getActivities(@Req() req: any) {
    return this.activities.forUser(getUserId(req));
  }

  @Get('me')
  async getMyMastery(@Req() req: any) {
    return this.masteryService.getUserMasteryProfile(
      getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.'),
    );
  }
}
