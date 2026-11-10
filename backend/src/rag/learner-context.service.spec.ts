import { jest } from '@jest/globals';
import { LearnerContextService, personalQuestion, tutorPage } from './learner-context.service';
import { RagChatService } from './rag-chat.service';
describe('Learner-aware tutor',()=>{
  it('recognizes personal intents and normalizes page labels without trusting arbitrary paths',()=>{
    for(const text of ['Hôm nay mình học gì?','Hiện tại tôi đang như thế nào?','Mình có tiến bộ không?']) expect(personalQuestion(text)).toBe(true);
    expect(personalQuestion('Phân biệt although và despite')).toBe(false);
    expect(tutorPage('/flashcards/35')).toBe('Học từ vựng');
    expect(tutorPage('/exam/42/review')).toBe('Xem lại bài thi');
    expect(tutorPage('/constructor')).toBe('Không xác định');
    expect(tutorPage('https://evil.invalid')).toBe('Không xác định');
  });
  it('reads only the current user and sends summaries without identity or answers',async()=>{
    const profile={skills:[{skillName:'Tenses',part:5,practiceCount:4,masteryScore:.4,scoreSource:'trained',lastPracticed:new Date()}],learningPlan:{items:[]}};
    const findMany=jest.fn<any>().mockResolvedValue([]), findUnique=jest.fn<any>().mockResolvedValue(null);
    const mastery={getUserMasteryProfile:jest.fn<any>().mockResolvedValue(profile)};
    const activities={forUser:jest.fn<any>().mockResolvedValue({sections:{vocabulary:[]}})};
    const progress={forUser:jest.fn<any>().mockResolvedValue({points:[],truncated:false})};
    const findPlacement=jest.fn<any>().mockResolvedValue({completedAt:new Date(),result:{answered:30,correct:19}});
    const service=new LearnerContextService({examAttempt:{findMany},curriculumEnrollment:{findUnique},placementAttempt:{findFirst:findPlacement}} as any,mastery as any,activities as any,progress as any);
    const result=await service.snapshot(7,'/recommendations');
    expect(mastery.getUserMasteryProfile).toHaveBeenCalledWith(7);
    expect(activities.forUser).toHaveBeenCalledWith(7,profile);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({where:{userId:7,submittedAt:{not:null}}}));
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty('answers');
    expect(findPlacement).toHaveBeenCalledWith(expect.objectContaining({where:{userId:7,status:'COMPLETED'},select:{completedAt:true,result:true}}));
    expect(result.lastPlacement?.result).toEqual({answered:30,correct:19});
    expect(result).not.toHaveProperty('email');expect(result.skills[0].predictedSuccess).toBe(.4);
    mastery.getUserMasteryProfile.mockRejectedValue(new Error('private db details'));
    const degraded=await service.snapshot(7);
    expect(degraded.unavailable).toContain('Hồ sơ kỹ năng');
    expect(JSON.stringify(degraded)).not.toContain('private db details');
  });
  it('answers a personal question from fresh server data even without grammar sources',async()=>{
    const create=jest.fn<any>().mockImplementation(async({data}:any)=>({...data,id:1,createdAt:new Date()}));
    const db={examAttempt:{findFirst:jest.fn<any>().mockResolvedValue(null)},aiChatMessage:{findMany:jest.fn<any>().mockResolvedValue([]),create}};
    const llm={generateText:jest.fn<any>().mockResolvedValue('Plan')};
    const learner={snapshot:jest.fn<any>().mockResolvedValue({asOf:'today',nextSteps:[{name:'Tenses'}],unavailable:[]})};
    const chat=new RagChatService(db as any,{retrieveContext:jest.fn<any>().mockResolvedValue([])} as any,llm as any,learner as any);
    const reply=await chat.handleUserMessage({userId:7,message:'Hôm nay học gì?',pagePath:'/flashcards'});
    expect(learner.snapshot).toHaveBeenCalledWith(7,'/flashcards');
    expect(llm.generateText.mock.calls[0][0].userPrompt).toContain('Tenses');
    expect(reply.content).toContain('/recommendations');
    expect(llm.generateText.mock.calls[0][0].systemPrompt).toContain('không phải phần trăm thành thạo');
    await chat.handleUserMessage({userId:7,message:'Vậy bắt đầu từ đâu?',pagePath:'/recommendations'});
    expect(learner.snapshot).toHaveBeenLastCalledWith(7,'/recommendations');
    expect(llm.generateText.mock.calls[1][0].userPrompt).toContain('TRANG HIỆN TẠI: Gợi ý học');
  });
  it('does not load personal context or generate when a live exam blocks access',async()=>{
    const learner={snapshot:jest.fn<any>()},llm={generateText:jest.fn<any>()};
    const db={examAttempt:{findFirst:jest.fn<any>().mockResolvedValue({id:2})}};
    const chat=new RagChatService(db as any,{} as any,llm as any,learner as any);
    await expect(chat.handleUserMessage({userId:7,message:'Hôm nay học gì?'})).rejects.toMatchObject({status:403});
    expect(learner.snapshot).not.toHaveBeenCalled();expect(llm.generateText).not.toHaveBeenCalled();
  });
});
