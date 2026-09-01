import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExamService } from './exam.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Controller('exam')
@UseGuards(AuthGuard('jwt'))
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post('start')
  startExam(@Request() req: any, @Body() dto: StartExamDto) {
    return this.examService.startExam(req.user.id, dto);
  }

  @Post('submit')
  submitExam(@Request() req: any, @Body() dto: SubmitExamDto) {
    return this.examService.submitExam(req.user.id, dto);
  }

  @Get(':id/review')
  getReview(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.examService.getReview(req.user.id, id);
  }
}
