import { jest } from '@jest/globals';
import { HistoryController } from './history.module';
import { PrismaService } from '../prisma/prisma.service';
describe('history ownership and navigation',()=>{
 it('scopes exams to the current learner and selects safe metadata',async()=>{
 const findMany=jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue([{id:5,examType:'CUSTOM',selectedParts:[2,7],questionIds:[1,2],startedAt:new Date(),submittedAt:null,totalScore:null}]);
 const controller=new HistoryController({examAttempt:{findMany,count:jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(13)}} as unknown as PrismaService);
 const result=await controller.list({user:{userId:7,id:7,sub:7}},{type:'EXAM',status:'IN_PROGRESS',page:2});
 expect(findMany.mock.calls[0][0]).toMatchObject({where:{userId:7,submittedAt:null},skip:12,take:12});
 expect(result.items[0]).toMatchObject({href:'/exam/5',title:'Luyện Part 2, 7'});
 expect(result.items[0]).not.toHaveProperty('questionIds');
 });
});
