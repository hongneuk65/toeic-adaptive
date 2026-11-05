import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getUserId } from '../common/user-id';
import type { RequestWithUser } from '../common/user-id';
import { EnrollCurriculumDto, SubmitCurriculumDto } from './curriculum.dto';
import { CurriculumService } from './curriculum.service';
@Controller('curriculum')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CurriculumController {
 constructor(private readonly service: CurriculumService) {}
 @Get() overview(@Req() req: RequestWithUser) { return this.service.overview(getUserId(req)); }
 @Post('enroll') enroll(@Req() req: RequestWithUser, @Body() dto: EnrollCurriculumDto) { return this.service.enroll(getUserId(req), dto); }
 @Get('units/:id') unit(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.unit(getUserId(req), id); }
 @Post('units/:id/submit') submit(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: SubmitCurriculumDto) { return this.service.submit(getUserId(req), id, dto); }
}
