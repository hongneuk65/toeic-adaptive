import { jest } from '@jest/globals';
import { ScreenContextService } from './screen-context.service';
import { RagChatService } from './rag-chat.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChatTutorDto } from './dto/rag.dto';
function reading(submitted=false){return {id:1,userId:7,submittedAt:submitted?new Date():null,answers:{0:{selected:1}},version:{id:9,title:'Notice',text:'The meeting starts at nine.',article:{ownerId:null,publishedVersionId:9,archived:false},questions:[{prompt:'When?',options:['Nine','Ten'],answer:0,explanation:'Nine in passage'}]}};}
describe('Server-owned screen context',()=>{
 it('looks up accessible cards rather than trusting browser words or identities',async()=>{
  const findFirst=jest.fn<any>().mockResolvedValue({id:2,word:'invoice',meaning:'hóa đơn',example:'Send the invoice.',folder:{name:'Office'}});
  const service=new ScreenContextService({flashcard:{findFirst}} as any);
  const result=await service.resolve(7,{screenKind:'vocabulary',screenId:'2',screenMode:'speaking',screenResponse:'Please send invoice'});
  expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:2,folder:{OR:[{userId:7},{private:false}]}}}));
  expect(result?.content).toMatchObject({word:'invoice'});expect(result?.learnerDraft).toBe('Please send invoice');
  findFirst.mockResolvedValue(null);await expect(service.resolve(8,{screenKind:'vocabulary',screenId:'2'})).rejects.toMatchObject({status:404});
 });
 it('strips reading keys before submission even when the browser claims review mode',async()=>{
  const findFirst=jest.fn<any>().mockResolvedValue(reading());
  const service=new ScreenContextService({readingAttempt:{findFirst}} as any);
  const params={screenKind:'reading',screenId:'1',screenIndex:0,screenMode:'review',screenResponse:'{correctAnswer:1}'};
  const before=await service.resolve(7,params);
  expect(before?.helpMode).toBe('hint-only');expect(before?.content).not.toHaveProperty('correctAnswer');expect(before?.content).not.toHaveProperty('explanation');
  expect(findFirst.mock.calls[0][0].where).toEqual({id:1,userId:7});
  findFirst.mockResolvedValue(reading(true));const after=await service.resolve(7,params);
  expect(after?.content).toMatchObject({correctAnswer:0,recordedSelection:1});
  findFirst.mockResolvedValue(null);await expect(service.resolve(8,params)).rejects.toMatchObject({status:404});
 });
 it('does not reveal dictation transcript until a matching saved answer exists',async()=>{
  const session={id:1,userId:7,source:{title:'Office audio',ownerId:null,published:true,deletedAt:null},transcriptId:2,start:0,end:30,mode:'DICTATION',difficulty:'EASY'};
  const findFirst=jest.fn<any>().mockResolvedValue(null);
  const service=new ScreenContextService({listeningSession:{findFirst:jest.fn<any>().mockResolvedValue(session)},listeningUnit:{findMany:jest.fn<any>().mockResolvedValue([{id:3,start:0,end:5,text:'Office opens at nine'}])},listeningAnswer:{findFirst}} as any);
  const before=await service.resolve(7,{screenKind:'listening',screenId:'1',screenMode:'SPEAK'});
  expect(before?.helpMode).toBe('hint-only');expect(before?.content).not.toHaveProperty('transcript');
  findFirst.mockResolvedValue({submitted:'Office opens nine',score:.8});const after=await service.resolve(7,{screenKind:'listening',screenId:'1'});
  expect(after?.content).toHaveProperty('transcript','Office opens at nine');
 });
 it('rejects invalid or incomplete screen scopes',async()=>{
  for(const value of [{message:'Help',screenKind:'vocabulary'},{message:'Help',screenKind:'admin',screenId:'1'},{message:'Help',screenKind:'reading',screenId:'1',screenIndex:-1}]) expect((await validate(plainToInstance(ChatTutorDto,value))).length).toBeGreaterThan(0);
 });
 it('uses current server content without requiring unrelated grammar retrieval, with scoped history',async()=>{
  const findMany=jest.fn<any>().mockResolvedValue([]),create=jest.fn<any>().mockImplementation(async({data}:any)=>({...data,id:1,createdAt:new Date()}));
  const db={examAttempt:{findFirst:jest.fn<any>().mockResolvedValue(null)},aiChatMessage:{findMany,create}};
  const llm={generateText:jest.fn<any>().mockResolvedValue('Invoice is an invoice.')};
  const screens={resolve:jest.fn<any>().mockResolvedValue({label:'invoice',content:{word:'invoice',meaning:'hóa đơn'},helpMode:'explain'})};
  const service=new RagChatService(db as any,{retrieveContext:jest.fn<any>().mockResolvedValue([])} as any,llm as any,undefined,screens as any);
  await service.handleUserMessage({userId:7,message:'Từ này nghĩa là gì?',screenKind:'vocabulary',screenId:'2',screenMode:'flashcard'});
  expect(screens.resolve).toHaveBeenCalledWith(7,expect.objectContaining({screenId:'2'}));
  expect(llm.generateText.mock.calls[0][0].userPrompt).toContain('hóa đơn');
  expect(findMany.mock.calls[0][0].where).toEqual({userId:7,contextData:JSON.stringify({screenKind:'vocabulary',screenId:'2',screenIndex:0,screenMode:'flashcard'})});
 });
});
