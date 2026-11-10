import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryService } from '../mastery/mastery.service';
import { ActivitiesService } from '../mastery/activities.service';
import { ProgressService } from '../mastery/progress.service';

export const personalQuestion = (message: string) => /hom nay|hoc gi|on gi|tien bo|ket qua|ho so|lich su|ke hoach|goi y|lo trinh|muc tieu|toi dang|minh dang|toi yeu|minh yeu|cua toi|cua minh|the con|tiep theo|nen (hoc|luyen|on)|do kho nao|trinh do/.test(message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d'));
const pages: Record<string,string> = {dashboard:'Trang chủ',recommendations:'Gợi ý học',flashcards:'Học từ vựng',theory:'Kiến thức',reading:'Luyện đọc',listening:'Luyện nghe',curriculum:'Lộ trình học',exam:'Thi thử',history:'Lịch sử luyện tập',placement:'Đánh giá đầu vào'};
export function tutorPage(path?: string): string {
  if (!path?.startsWith('/')) return 'Không xác định';
  if (/^\/exam\/\d+\/review\/?$/.test(path)) return 'Xem lại bài thi';
  if (/^\/exam\/\d+\/?$/.test(path)) return 'Phòng thi thử';
  if (/^\/theory\/\d+\/quiz\/?$/.test(path)) return 'Bài kiểm tra kiến thức';
  const section = path.split('/')[1];
  return Object.hasOwn(pages, section) ? pages[section] : 'Không xác định';
}
@Injectable()
export class LearnerContextService {
  constructor(private readonly prisma: PrismaService, private readonly mastery: MasteryService, private readonly activities: ActivitiesService, private readonly progress: ProgressService) {}
  async snapshot(userId:number, page?:string) {
    const unavailable:string[]=[];
    const safely = async <T>(name:string,run:()=>Promise<T>):Promise<T|null> => {try{return await run();}catch{unavailable.push(name);return null;}};
    const [profile,progress,exams,enrollment,preferences,placement] = await Promise.all([
      safely('Hồ sơ kỹ năng',()=>this.mastery.getUserMasteryProfile(userId)),
      safely('Tiến bộ',()=>this.progress.forUser(userId,'30')),
      safely('Kết quả thi',()=>this.prisma.examAttempt.findMany({where:{userId,submittedAt:{not:null}},orderBy:{submittedAt:'desc'},take:3,select:{examType:true,selectedParts:true,submittedAt:true,totalScore:true,listeningScore:true,readingScore:true}})),
      safely('Lộ trình',()=>this.prisma.curriculumEnrollment.findUnique({where:{userId},select:{trackId:true,minutesPerDay:true,startedAt:true}})),
      safely('Mục tiêu',()=>this.prisma.user.findUnique({where:{id:userId},select:{learningPreferences:true}})),
      safely('Đánh giá đầu vào',()=>this.prisma.placementAttempt.findFirst({
        where:{userId,status:'COMPLETED'},
        orderBy:{completedAt:'desc'},
        select:{completedAt:true,result:true},
      })),
    ]);
    const activities=await safely('Gợi ý học',()=>this.activities.forUser(userId,profile || undefined));
    const totals = (points:NonNullable<typeof progress>['points']) => points.reduce((s,p)=>({attempts:s.attempts+p.attempts,newQuestions:s.newQuestions+p.newQuestions,newCorrect:s.newCorrect+p.newCorrect,revisits:s.revisits+p.revisits,repeatedErrors:s.repeatedErrors+p.repeatedErrors,corrected:s.corrected+p.corrected}),{attempts:0,newQuestions:0,newCorrect:0,revisits:0,repeatedErrors:0,corrected:0});
    const prefs = preferences?.learningPreferences;
    const goal = prefs && typeof prefs === 'object' && !Array.isArray(prefs) ? prefs : {};
    const skillsById = new Map(profile?.skills.map(skill => [skill.skillId, skill.skillName]));
    const recommendedTopics = profile?.topicGroups?.filter(topic => topic.practiceSkillIds.length || topic.lesson).slice(0, 3).map(topic => ({
      name: topic.title,
      parts: topic.parts,
      priority: topic.priority,
      focusSkills: topic.focusSkillIds.filter(id => topic.practiceSkillIds.includes(id)).map(id => skillsById.get(id)),
      href: '/recommendations',
      lessonHref: topic.lesson ? `/theory?topic=${encodeURIComponent(topic.id)}&lesson=${topic.lesson.id}` : null,
    })) ?? [];
    return {asOf:new Date().toISOString(),timezone:'Asia/Ho_Chi_Minh',currentPage:tutorPage(page),
      goal:{focus:typeof goal.goal==='string'?goal.goal.slice(0,60):null,targetScore:typeof goal.targetScore==='number'?goal.targetScore:null},
      skills:profile?.skills.filter(s=>s.practiceCount>0).sort((a,b)=>a.masteryScore-b.masteryScore).slice(0,12).map(s=>({name:s.skillName,part:s.part,predictedSuccess:s.masteryScore,scoreSource:s.scoreSource,practiceCount:s.practiceCount,lastPracticed:s.lastPracticed})) || [],
      recommendedTopics,
      nextSteps:recommendedTopics.length ? [] : profile?.learningPlan.items.slice(0,3).map(i=>({name:i.skillName,part:i.part,priority:i.priority,href:i.lesson?`/theory?lesson=${i.lesson.id}`:'/recommendations'})) || [],
      activities:activities?.sections || null, recentExams:exams,enrollment,
      lastPlacement:placement ? {completedAt:placement.completedAt,result:placement.result,href:'/placement'} : null,
      progress:progress?{last30Days:totals(progress.points),previous15Days:totals(progress.points.slice(0,15)),recent15Days:totals(progress.points.slice(15)),truncated:progress.truncated}:null,
      unavailable,
      limitations:['DAS3H dự đoán xác suất đúng, không phải tỷ lệ thành thạo đã kiểm chứng.','Tiến bộ chỉ gồm lịch sử câu hỏi gắn kỹ năng đã lưu; câu mới là lần đầu gặp trong lịch sử này.','Lỗi lặp lại là gặp lại cùng câu từng sai, không chứng minh chuyển giao sang câu mới.','Không so sánh điểm giữa các loại đề hoặc mức khó khác nhau như cùng một thang đo.'],
    };
  }
}
