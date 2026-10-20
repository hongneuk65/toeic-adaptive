import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TheoryService } from './theory.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { getOptionalUserId } from '../common/user-id';

@Controller('theory')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TheoryController {
  constructor(private readonly theoryService: TheoryService) { }

  @Get('catalog')
  getCatalog() { return this.theoryService.getCatalog(); }

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
    @Req() req: any, // Ngày 18: Lấy thông tin user đăng nhập
  ) {
    const userId = getOptionalUserId(req.user);
    return this.theoryService.submitQuiz(id, dto, userId);
  }
}
