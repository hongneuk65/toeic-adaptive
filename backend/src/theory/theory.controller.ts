import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TheoryService } from './theory.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Controller('theory')
@UseGuards(AuthGuard('jwt'))
export class TheoryController {
  constructor(private theoryService: TheoryService) {}

  @Get('part/:part')
  getLessonsByPart(@Param('part', ParseIntPipe) part: number) {
    return this.theoryService.getLessonsByPart(part);
  }

  @Get(':id')
  getLessonDetail(@Param('id', ParseIntPipe) id: number) {
    return this.theoryService.getLessonDetail(id);
  }

  @Get(':id/quiz')
  getLessonQuiz(@Param('id', ParseIntPipe) id: number) {
    return this.theoryService.getLessonQuiz(id);
  }

  @Post(':id/quiz/submit')
  submitQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.theoryService.submitQuiz(id, dto);
  }
}