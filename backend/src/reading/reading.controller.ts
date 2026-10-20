import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingService } from './reading.service';
import {
  PersonalReadingDto,
  ReadingDraftDto,
  ReadingProgressDto,
  ReadingPublishDto,
  ReadingReportDto,
  ReadingTutorDto,
  ReadingWordDto,
} from './reading.dto';
interface RequestUser {
  user: { id: number };
}
@Controller('reading')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReadingController {
  constructor(private readonly service: ReadingService) {}
  @Get() list(@Req() req: RequestUser) {
    return this.service.list(req.user.id);
  }
  @Post('personal') personal(
    @Req() req: RequestUser,
    @Body() dto: PersonalReadingDto,
  ) {
    return this.service.personal(req.user.id, dto);
  }
  @Get('articles/:id') view(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.view(req.user.id, id);
  }
  @Post('articles/:id/retry') retry(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.enqueue(req.user.id, id);
  }
  @Post('articles/:id/start') start(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.start(req.user.id, id);
  }
  @Get('attempts/:id') attempt(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.attempt(req.user.id, id);
  }
  @Patch('attempts/:id') progress(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingProgressDto,
  ) {
    return this.service.progress(req.user.id, id, dto);
  }
  @Post('attempts/:id/submit') submit(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingProgressDto,
  ) {
    return this.service.progress(req.user.id, id, dto, true);
  }
  @Post('attempts/:id/tutor') tutor(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingTutorDto,
  ) {
    return this.service.tutor(req.user.id, id, dto);
  }
  @Post('attempts/:id/words') word(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingWordDto,
  ) {
    return this.service.saveWord(req.user.id, id, dto);
  }
  @Post('attempts/:id/reports') report(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingReportDto,
  ) {
    return this.service.report(req.user.id, id, dto.reason, dto.questionIndex);
  }
}
@Controller('reading/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class ReadingAdminController {
  constructor(
    private readonly service: ReadingService,
    private readonly prisma: PrismaService,
  ) {}
  @Get() overview() {
    return this.service.adminOverview();
  }
  @Get('articles/:id') view(@Param('id', ParseIntPipe) id: number) {
    return this.service.systemArticle(id);
  }
  @Post('articles') create(
    @Req() req: RequestUser,
    @Body() dto: ReadingDraftDto,
  ) {
    return this.service.draft(req.user.id, dto);
  }
  @Post('articles/:id/versions') edit(
    @Req() req: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingDraftDto,
  ) {
    return this.service.draft(req.user.id, dto, id);
  }
  @Post('articles/:id/review') review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingPublishDto,
  ) {
    return this.service.review(id, dto.versionId);
  }
  @Post('articles/:id/publish') publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReadingPublishDto,
  ) {
    return this.service.publish(id, dto.versionId);
  }
  @Post('articles/:id/archive') archive(@Param('id', ParseIntPipe) id: number) {
    return this.service.archive(id);
  }
  @Patch('reports/:id') resolve(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.readingReport.update({
      where: { id },
      data: { resolved: true },
    });
  }
}
