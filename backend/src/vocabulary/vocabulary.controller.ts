import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getUserId } from '../common/user-id';
import { VocabularyLookupDto, ExplainVocabularyDto, SaveVocabularyDto } from './vocabulary.dto';
import { VocabularyService } from './vocabulary.service';
@Controller('vocabulary')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VocabularyController {
  constructor(private readonly vocabulary: VocabularyService) {}
  @Get('lookup') lookup(@Req() req: { user: { id: number } }, @Query() dto: VocabularyLookupDto) { return this.vocabulary.lookup(getUserId(req), dto.word); }
  @Post('explain') explain(@Req() req: { user: { id: number } }, @Body() dto: ExplainVocabularyDto) { return this.vocabulary.explain(getUserId(req), dto); }
  @Post('save') save(@Req() req: { user: { id: number } }, @Body() dto: SaveVocabularyDto) { return this.vocabulary.save(getUserId(req), dto); }
}
