import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import {
  AdminQueryDto,
  KnowledgeDto,
  KnowledgeReviewDto,
  QuestionStatusDto,
  SystemFlashcardDto,
  ResolveReportDto,
  SkillDto,
  TheoryDto,
  UpdateQuestionDto,
  UserRoleDto,
} from './dto/admin.dto';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminAccessGuard)
@UseInterceptors(AdminAuditInterceptor)
export class AdminController {
  constructor(private adminService: AdminService) {}
  @Get('overview') overview() {
    return this.adminService.overview();
  }
  @Get('skills') getAllSkills() {
    return this.adminService.getAllSkills();
  }
  @Get('skills/catalog') skills(@Query() q: AdminQueryDto) {
    return this.adminService.list('skills', q);
  }
  @Get('users') users(@Query() q: AdminQueryDto) {
    return this.adminService.list('users', q);
  }
  @Get('questions') questions(@Query() q: AdminQueryDto) {
    return this.adminService.list('questions', q);
  }
  @Get('theory') theory(@Query() q: AdminQueryDto) {
    return this.adminService.list('theory', q);
  }
  @Get('exams') exams(@Query() q: AdminQueryDto) {
    return this.adminService.list('exams', q);
  }
  @Get('flashcards') flashcards(@Query() q: AdminQueryDto) {
    return this.adminService.list('flashcards', q);
  }
  @Get('knowledge') knowledge(@Query() q: AdminQueryDto) {
    return this.adminService.list('knowledge', q);
  }
  @Get('reading-articles') articles(@Query() q: AdminQueryDto) {
    return this.adminService.list('readingArticles', q);
  }
  @Get('listening-sources') sources(@Query() q: AdminQueryDto) {
    return this.adminService.list('listeningSources', q);
  }
  @Get('reading-reports') readingReports(@Query() q: AdminQueryDto) {
    return this.adminService.list('readingReports', q);
  }
  @Get('listening-reports') listeningReports(@Query() q: AdminQueryDto) {
    return this.adminService.list('listeningReports', q);
  }
  @Get('audit-logs') auditLogs(@Query() q: AdminQueryDto) {
    return this.adminService.list('auditLogs', q);
  }
  @Get('ai-events') ai(@Query() q: AdminQueryDto) {
    return this.adminService.list('aiEvents', q);
  }
  @Post('questions') createQuestion(@Body() dto: CreateQuestionDto) {
    return this.adminService.createQuestion(dto);
  }
  @Patch('questions/:id') updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.adminService.updateQuestion(id, dto);
  }
  @Patch('questions/:id/status') questionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: QuestionStatusDto,
  ) {
    return this.adminService.setQuestionStatus(id, dto);
  }
  @Post('skills') createSkill(@Body() dto: SkillDto) {
    return this.adminService.saveSkill(dto);
  }
  @Patch('skills/:id') updateSkill(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SkillDto,
  ) {
    return this.adminService.saveSkill(dto, id);
  }
  @Post('theory') createTheory(@Body() dto: TheoryDto) {
    return this.adminService.saveTheory(dto);
  }
  @Patch('theory/:id') updateTheory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TheoryDto,
  ) {
    return this.adminService.saveTheory(dto, id);
  }
  @Delete('theory/:id') deleteTheory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteTheory(id);
  }
  @Patch('users/:id/role') role(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UserRoleDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.adminService.updateRole(req.user.id, id, dto.role);
  }
  @Patch('reading-reports/:id') resolveReading(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport('reading', id, dto.resolved);
  }
  @Patch('listening-reports/:id') resolveListening(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport('listening', id, dto.resolved);
  }
  @Post('knowledge') createKnowledge(@Body() dto: KnowledgeDto) {
    return this.adminService.saveKnowledge(dto);
  }
  @Patch('knowledge/:id') updateKnowledge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KnowledgeDto,
  ) {
    return this.adminService.saveKnowledge(dto, id);
  }
  @Patch('knowledge/:id/review') reviewKnowledge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KnowledgeReviewDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.adminService.reviewKnowledge(req.user.id, id, dto);
  }
  @Post('flashcards') createFlashcard(
    @Body() dto: SystemFlashcardDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.adminService.saveSystemFlashcard(dto, req.user.id);
  }
  @Patch('flashcards/:id') updateFlashcard(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SystemFlashcardDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.adminService.saveSystemFlashcard(dto, req.user.id, id);
  }
}
