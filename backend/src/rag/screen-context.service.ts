import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurriculumService } from '../curriculum/curriculum.service';
export interface ScreenScope { screenKind?: string; screenId?: string; screenIndex?: number; screenMode?: string; }
export interface ScreenRequest extends ScreenScope { screenMode?: string; screenResponse?: string; }
const cut=(text:unknown,max=12000)=>typeof text==='string'?text.slice(0,max):'';
function object(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
@Injectable()
export class ScreenContextService {
 constructor(private readonly prisma:PrismaService){}
 async resolve(userId:number,scope:ScreenRequest){
  if(!scope.screenKind)return null;
  const kind=scope.screenKind,id=scope.screenId,index=scope.screenIndex??0;
  if(!id||!Number.isInteger(index)||index<0||index>9999)throw new BadRequestException('Ngữ cảnh màn hình không hợp lệ.');
  const numeric=Number(id);
  if(kind!=='curriculum'&&(!Number.isSafeInteger(numeric)||numeric<1))throw new BadRequestException('Mã nội dung không hợp lệ.');
  const client={mode:cut(scope.screenMode,40),learnerDraft:cut(scope.screenResponse,3000),draftStatus:'Nội dung chưa lưu do trình duyệt cung cấp; không phải kết quả chấm điểm.'};
  if(kind==='vocabulary'){
   const card=await this.prisma.flashcard.findFirst({where:{id:numeric,folder:{OR:[{userId},{private:false}]}},select:{id:true,word:true,meaning:true,phonetic:true,example:true,folder:{select:{name:true}}}});
   if(!card)throw new NotFoundException('Không tìm thấy từ vựng hoặc không có quyền truy cập.');
   return {kind,id:numeric,label:card.word,content:{word:cut(card.word),meaning:cut(card.meaning),phonetic:cut(card.phonetic),example:cut(card.example),folder:cut(card.folder?.name)},...client,helpMode:['quiz','dictation','typed'].includes(client.mode)?'hint-only':'explain',source:'Nội dung thẻ từ của hệ thống; không phải tài liệu ngữ pháp đã duyệt.'};
  }
  if(kind==='theory'){
   const lesson=await this.prisma.theoryLesson.findUnique({where:{id:numeric},select:{id:true,title:true,content:true,part:true,skill:{select:{code:true,name:true}}}});
   if(!lesson)throw new NotFoundException('Không tìm thấy bài học.');
   return {kind,label:lesson.title,content:{...lesson,content:cut(lesson.content)},...client,helpMode:'explain',source:'Bài học đang mở, chưa tự chứng minh mọi nhận định; quy tắc bổ sung cần tài liệu được duyệt.'};
  }
  if(kind==='reading'){
   const attempt=await this.prisma.readingAttempt.findFirst({where:{id:numeric,userId},include:{version:{include:{article:{select:{ownerId:true,publishedVersionId:true,archived:true}}}}}});
   if(!attempt)throw new NotFoundException('Không tìm thấy bài đọc của bạn.');
   const v=attempt.version,a=v.article;
   if(a.archived||(a.ownerId!==userId&&a.publishedVersionId!==v.id))throw new ForbiddenException('Bài đọc không còn được phép truy cập.');
   const q=Array.isArray(v.questions)?object(v.questions[index]):{};
   if(!q.prompt)throw new BadRequestException('Câu hỏi đọc không hợp lệ.');
   const saved=object(object(attempt.answers)[String(index)]);
   return {kind,label:v.title,content:{title:cut(v.title),passage:cut(v.text,24000),questionIndex:index,prompt:cut(q.prompt),options:Array.isArray(q.options)?q.options.map(o=>cut(o,1500)).slice(0,8):[],...(attempt.submittedAt?{correctAnswer:q.answer,explanation:cut(q.explanation),recordedSelection:saved.selected}:{} )},...client,submitted:!!attempt.submittedAt,helpMode:attempt.submittedAt?'explain':'hint-only',source:'Phiên bản bài đọc và kết quả do server lưu.'};
  }
  if(kind==='listening'){
   const session=await this.prisma.listeningSession.findFirst({where:{id:numeric,userId},include:{source:true}});
   if(!session)throw new NotFoundException('Không tìm thấy phiên nghe của bạn.');
   if(session.source.deletedAt||(session.source.ownerId!==userId&&!session.source.published))throw new ForbiddenException('Không có quyền truy cập nguồn nghe.');
   const units=await this.prisma.listeningUnit.findMany({where:{transcriptId:session.transcriptId??-1,start:{gte:session.start},end:{lte:session.end}},orderBy:{position:'asc'},skip:index,take:1});
   const unit=units[0];if(!unit)throw new NotFoundException('Chưa có lời thoại cho đoạn nghe này.');
   const answer=await this.prisma.listeningAnswer.findFirst({where:{sessionId:numeric,unitId:unit.id,mode:session.mode,difficulty:session.difficulty},orderBy:{createdAt:'desc'},select:{submitted:true,score:true}});
   return {kind,label:session.source.title,content:{title:cut(session.source.title),mode:session.mode,unitIndex:index,start:unit.start,end:unit.end,...(answer||session.mode==='SPEAK'?{transcript:cut(unit.text)}:{}),...(answer?{recordedResponse:cut(answer.submitted),score:answer.score}:{} )},...client,helpMode:answer||session.mode==='SPEAK'?'explain':'hint-only',source:'Đoạn nghe và kết quả server; AI không trực tiếp nghe file âm thanh.'};
  }
  if(kind==='curriculum'){
   const unit=await new CurriculumService(this.prisma).unit(userId,id);
   const checkpoint=client.mode==='checkpoint';
   const q=checkpoint?unit.checkpoint[index]:client.mode==='guided'?unit.guided[index]:undefined;
   return {kind,label:unit.title,content:{title:unit.title,objectives:unit.objectives,knowledge:unit.knowledge,reading:cut(unit.reading),...(checkpoint?{}:{listening:cut(unit.listening)}),...(q?{prompt:q.prompt,options:q.options}:{} )},...client,helpMode:checkpoint?'hint-only':'explain',source:'Bài lộ trình đã được server kiểm tra quyền mở. Không bao gồm đáp án checkpoint.'};
  }
  throw new BadRequestException('Loại ngữ cảnh chưa hỗ trợ.');
 }
}
