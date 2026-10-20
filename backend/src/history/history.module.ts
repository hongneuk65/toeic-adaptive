import { Module, Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { getUserId } from '../common/user-id';
class HistoryQuery {
 @IsIn(['EXAM','READING']) type: 'EXAM'|'READING' = 'EXAM';
 @IsIn(['ALL','IN_PROGRESS','COMPLETED']) status = 'ALL';
 @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
}
@Controller('history')
@UseGuards(AuthGuard('jwt'))
export class HistoryController {
 constructor(private readonly prisma: PrismaService) {}
 @Get()
 async list(@Request() req: any, @Query() query: HistoryQuery) {
  const where = {userId:getUserId(req), ...(query.status === 'COMPLETED' ? {submittedAt:{not:null}} : query.status === 'IN_PROGRESS' ? {submittedAt:null} : {})};
  const paging = {skip:(query.page-1)*12,take:12,orderBy:[{startedAt:'desc' as const},{id:'desc' as const}]};
  if(query.type === 'READING') {
   const [rows,total]=await Promise.all([this.prisma.readingAttempt.findMany({where,...paging,select:{id:true,startedAt:true,submittedAt:true,correct:true,total:true,version:{select:{title:true}}}}),this.prisma.readingAttempt.count({where})]);
   return {total,page:query.page,pageSize:12,items:rows.map(row=>({id:row.id,title:row.version.title,startedAt:row.startedAt,submittedAt:row.submittedAt,result:row.submittedAt ? `${row.correct ?? 0}/${row.total ?? 0} câu đúng` : null,href:`/reading?attempt=${row.id}`}))};
  }
  const [rows,total]=await Promise.all([this.prisma.examAttempt.findMany({where,...paging,select:{id:true,examType:true,startedAt:true,submittedAt:true,totalScore:true,selectedParts:true,questionIds:true}}),this.prisma.examAttempt.count({where})]);
  return {total,page:query.page,pageSize:12,items:rows.map(row=>({id:row.id,title:row.examType === 'CUSTOM' ? `Luyện Part ${row.selectedParts.join(', ')}` : row.examType === 'FULL' ? 'Thi thử TOEIC đầy đủ' : row.examType === 'PART_5' ? 'Luyện Part 5' : 'Thi thử TOEIC rút gọn',startedAt:row.startedAt,submittedAt:row.submittedAt,questionCount:row.questionIds.length,result:row.submittedAt ? `${row.totalScore ?? 0} điểm` : null,href:`/exam/${row.id}${row.submittedAt ? '/review' : ''}`}))};
 }
}
@Module({imports:[PrismaModule],controllers:[HistoryController]})
export class HistoryModule {}

