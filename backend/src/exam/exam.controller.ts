import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExamService } from './exam.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { getUserId } from '../common/user-id';

@Controller('exam')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get('catalog')
  catalog() { return this.examService.catalog(); }

  @Post('start')
  startExam(@Request() req: any, @Body() dto: StartExamDto) {
    return this.examService.startExam(getUserId(req), dto);
  }

  @Post('submit')
  submitExam(@Request() req: any, @Body() dto: SubmitExamDto) {
    return this.examService.submitExam(getUserId(req), dto);
  }

  @Patch(':id/draft')
  saveDraft(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveDraftDto) {
    return this.examService.saveDraft(getUserId(req), id, dto);
  }

  @Get(':id/review')
  getReview(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.examService.getReview(getUserId(req), id);
  }

  @Get(':id')
  getExam(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.examService.getExam(getUserId(req), id);
  }
}
