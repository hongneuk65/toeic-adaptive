import { jest } from '@jest/globals';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { CURRICULUM_TRACKS } from './catalog';
import { PrismaService } from '../prisma/prisma.service';

describe('persistent user-owned curriculum',()=>{
 const first=CURRICULUM_TRACKS[0], unit=first.units[0];
 const key=(userId:number,id:string)=>`${userId}:${id}`;
 let enrollments:Map<number,any>, progress:Map<string,any>, attempts:Map<string,any>, db:any, service:CurriculumService;
 beforeEach(()=>{
  enrollments=new Map();progress=new Map();attempts=new Map();
  db={
   $executeRaw:jest.fn<any>().mockResolvedValue(1),
   curriculumEnrollment:{
    findUnique:jest.fn<any>().mockImplementation(async({where}:any)=>enrollments.get(where.userId)??null),
    upsert:jest.fn<any>().mockImplementation(async({where,create,update}:any)=>{
     const item={startedAt:new Date('2026-11-01T00:00:00Z'),updatedAt:new Date(),...(enrollments.get(where.userId)??create),...update};
     enrollments.set(where.userId,item);return item;
    }),
   },
   curriculumProgress:{
    findMany:jest.fn<any>().mockImplementation(async({where}:any)=>[...progress.values()].filter(p=>p.userId===where.userId)),
    upsert:jest.fn<any>().mockImplementation(async({where,create,update}:any)=>{
     const k=key(where.userId_unitId.userId,where.userId_unitId.unitId), old=progress.get(k);
     const item={id:progress.size+1,...(old?{...old,...update,revision:old.revision+1}:{...create,revision:0})};
     progress.set(k,item);return item;
    }),
   },
   curriculumAttempt:{
    findMany:jest.fn<any>().mockImplementation(async({where}:any)=>[...attempts.values()].filter(a=>a.userId===where.userId &&
     a.createdAt >= where.createdAt.gte && a.createdAt < where.createdAt.lt)),
    findUnique:jest.fn<any>().mockImplementation(async({where}:any)=>attempts.get(key(where.userId_requestId.userId,where.userId_requestId.requestId))??null),
    create:jest.fn<any>().mockImplementation(async({data}:any)=>{
     const item={id:attempts.size+1,createdAt:new Date(),...data};attempts.set(key(data.userId,data.requestId),item);return item;
    }),
   },
  };
  db.$transaction=jest.fn<any>().mockImplementation(async(fn:any)=>fn(db));
  service=new CurriculumService(db as PrismaService);
 });
 const answers=()=>Object.fromEntries(unit.checkpoint.map(q=>[q.id,q.answer]));
 async function enroll(userId=1,trackId=first.id){return service.enroll(userId,{trackId,minutesPerDay:30});}
 it('returns no checkpoint answer or explanation before submission',async()=>{
  await enroll();const result=await service.unit(1,unit.id);
  expect(result.checkpoint.length).toBeGreaterThan(0);
  for(const q of result.checkpoint){expect(q).not.toHaveProperty('answer');expect(q).not.toHaveProperty('explanation');}
  expect(result.guided[0]).toHaveProperty('answer');
 });
 it('persists server-graded completion once and replays stored results on duplicate requests',async()=>{
  await enroll();const dto={requestId:'request_0001',answers:answers()};
  const result=await service.submit(1,unit.id,dto), replay=await service.submit(1,unit.id,dto);
  expect(result).toEqual(replay);expect(result).toMatchObject({score:100,passed:true});
  expect(attempts.size).toBe(1);expect(progress.size).toBe(1);
  expect(db.curriculumProgress.upsert).toHaveBeenCalledTimes(1);
  expect(db.$executeRaw).toHaveBeenCalled();
  const changed={...dto,answers:{...dto.answers,[unit.checkpoint[0].id]:(unit.checkpoint[0].answer+1)%unit.checkpoint[0].options.length}};
  await expect(service.submit(1,unit.id,changed)).rejects.toThrow('đã được dùng');
 });
 it('scopes attempts and progress to authenticated user even when request IDs match',async()=>{
  await enroll(1);await enroll(2);
  const dto={requestId:'same_request',answers:answers()};await service.submit(1,unit.id,dto);
  expect((await service.overview(2)).progress.completed).toBe(0);
  await service.submit(2,unit.id,dto);expect(attempts.size).toBe(2);
  expect((await service.overview(1)).progress.completed).toBe(1);
 });
 it('rejects locked units and invalid answers without saving progress',async()=>{
  await enroll();const locked=first.units.find(u=>u.prerequisites.length>0)!;
  await expect(service.unit(1,locked.id)).rejects.toThrow('kiến thức nền');
  await expect(service.submit(1,locked.id,{requestId:'locked_request',answers:Object.fromEntries(locked.checkpoint.map(q=>[q.id,q.answer]))})).rejects.toThrow('chưa được mở');
  await expect(service.submit(1,unit.id,{requestId:'invalid_request',answers:{}})).rejects.toThrow('đầy đủ');
  expect(progress.size).toBe(0);expect(attempts.size).toBe(0);
 });
 it('retains prior track progress and due reviews after switching tracks',async()=>{
  await enroll();await service.submit(1,unit.id,{requestId:'request_saved',answers:answers()});
  const saved=progress.get(key(1,unit.id));saved.nextReviewAt=new Date('2020-01-01');
  attempts.get(key(1,'request_saved')).createdAt=new Date('2020-01-01');
  const nextTrack=CURRICULUM_TRACKS[1];await enroll(1,nextTrack.id);
  const overview=await service.overview(1);
  expect(overview.today[0]).toMatchObject({id:unit.id,trackId:first.id,reason:'review'});
  await expect(service.unit(1,unit.id)).resolves.toMatchObject({access:{completed:true,unlocked:true}});
  expect(progress.size).toBe(1);
 });
 it('stops the daily plan after a successful full unit and counts repeats only once',async()=>{
  await enroll();
  await service.submit(1,unit.id,{requestId:'daily_pass_1',answers:answers()});
  await service.submit(1,unit.id,{requestId:'daily_pass_2',answers:answers()});
  const overview=await service.overview(1);
  expect(overview.daySummary).toMatchObject({budgetMinutes:30,completedMinutes:unit.minutes,remainingMinutes:0});
  expect(overview.today).toEqual([]);
  expect(overview.progress.completed).toBe(1);
 });
 it('does not consume the daily workload budget when an attempt fails',async()=>{
  await enroll();
  const wrong=Object.fromEntries(unit.checkpoint.map(q=>[q.id,(q.answer+1)%q.options.length]));
  await service.submit(1,unit.id,{requestId:'daily_fail_1',answers:wrong});
  const overview=await service.overview(1);
  expect(overview.daySummary).toMatchObject({budgetMinutes:30,completedMinutes:0,remainingMinutes:30});
  expect(overview.today[0]).toMatchObject({id:unit.id,reason:'new'});
  expect(db.curriculumAttempt.findMany.mock.calls.at(-1)[0].where).toMatchObject({userId:1,createdAt:{gte:expect.any(Date),lt:expect.any(Date)}});
 });
 it('cannot resolve a caller-provided user ID outside the authenticated request',()=>{
  const controller=new CurriculumController(service);
  expect(()=>controller.overview({user:{}})).toThrow('danh tính');
 });
});
