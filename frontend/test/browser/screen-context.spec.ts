import {test,expect,type Page} from '@playwright/test';
async function fixture(page:Page,slow=false){
 let release:(()=>void)|undefined;
 const sent:Record<string,unknown>[]=[];const history:URL[]=[];
 await page.addInitScript(()=>localStorage.setItem('accessToken','fixture'));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),p=url.pathname.replace(/^\/api/,'');const json=(v:unknown)=>route.fulfill({json:v});
  if(p==='/auth/me')return json({id:1,role:'USER'});
  if(p==='/auth/learning-status')return json({hasLearningActivity:true,onboardingRequired:false});
  if(p==='/rag/chat-history'){history.push(url);return json([]);}
  if(p==='/rag/chat-stream'){sent.push(route.request().postDataJSON());if(slow&&sent.length===1)await new Promise<void>(resolve=>{release=resolve;});return route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({chunk:'Đang giải thích đúng nội dung màn hình.'})+'\n\ndata: [DONE]\n\n'}).catch(()=>{});}
  if(p==='/flashcards/folders/1')return json({id:1,name:'Office',isOwner:false});
  if(p==='/flashcards/folders/1/cards')return json([{id:1,word:'invoice',meaning:'hóa đơn'},{id:2,word:'meeting',meaning:'cuộc họp'}]);
  if(p==='/flashcards/folders/1/reviews')return json([]);
  if(p==='/theory/catalog')return json([]);
  if(p==='/theory/1')return json({id:1,title:'Tenses lesson',content:'Use time references.',part:5,skill:{code:'TENSE',name:'Tenses'}});
  if(p==='/reading')return json({articles:[],attempts:[],limits:{maxText:10000,maxQuestions:5}});
  if(p==='/reading/attempts/1')return json({id:1,currentIndex:0,answers:{},submittedAt:null,elapsedSeconds:0,version:{id:9,articleId:1,title:'Office notice',text:'The office opens at nine.',kind:'NOTICE',difficulty:'EASY',questions:[{type:'DETAIL',prompt:'When?',options:['Nine','Ten'],evidenceRequired:false},{type:'MAIN',prompt:'What?',options:['Office','Hotel'],evidenceRequired:false}]}});
  if(p==='/listening')return json({sources:[],sessions:[],settings:{},asrAvailable:false});
  if(p==='/listening/sessions/7')return json({id:7,currentIndex:0,totalUnits:1,source:{id:9,title:'Office audio',kind:'AUDIO',url:'/fixture.mp3'},sourceId:9,start:0,end:180,unit:{id:3,start:0,end:5,wordCount:4},mode:'DICTATION',difficulty:'EASY',settings:{maxRecordingSeconds:60}});
  if(p==='/curriculum/units/f01')return json({id:'f01',title:'Sentence basics',minutes:20,objectives:['Find the verb'],prerequisites:[],access:{unlocked:true},trackId:'foundation',knowledge:'A sentence has a subject and verb.',examples:[],vocabulary:[],reading:'',listening:'',guided:[{id:'g1',kind:'knowledge',prompt:'Choose the verb',options:['Works','Work'],answer:0,explanation:'Singular subject.'}],checkpoint:[{id:'c1',kind:'knowledge',prompt:'Choose the word',options:['Works','Work']}]});
  if(p==='/mastery/activities')return json({sections:{theory:[],vocabulary:[],reading:[],listening:[]}});
  return json({});
 });return{sent,history,release:()=>release?.()};
}
async function ask(page:Page){await page.getByRole('button',{name:'Mở Gia sư AI',exact:true}).click();await page.getByRole('textbox',{name:'Tin nhắn cho Gia sư AI'}).fill('Giải thích nội dung này');await page.getByRole('button',{name:'Gửi',exact:true}).click();}
test('word chat receives the current card and unsaved typing without saving a learning result',async({page})=>{
 const {sent,history}=await fixture(page);await page.goto('/flashcards/1');
 await page.getByRole('textbox',{name:'Câu trả lời của bạn',exact:true}).fill('invoise');
 await ask(page);await expect.poll(()=>sent.length).toBe(1);
 expect(sent[0]).toMatchObject({screenKind:'vocabulary',screenId:'1',screenMode:'typed',screenResponse:'invoise'});
 expect(history.at(-1)?.searchParams.get('screenId')).toBe('1');
 await expect(page.getByRole('complementary',{name:'Gia sư AI'})).toContainText('invoice');
});
test('changing cards resets scoped chat and sends the new card instead of the old one',async({page})=>{
 const {sent}=await fixture(page);await page.goto('/flashcards/1');await page.getByRole('button',{name:'Flashcard',exact:true}).click();
 await ask(page);await expect.poll(()=>sent.length).toBe(1);
 await expect(page.getByText('Đang giải thích đúng nội dung màn hình.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Thẻ tiếp',exact:true}).click();
 await expect(page.getByRole('complementary',{name:'Gia sư AI'})).toContainText('meeting');
 await expect(page.getByText('Đang giải thích đúng nội dung màn hình.',{exact:true})).toHaveCount(0);
 await page.getByRole('textbox',{name:'Tin nhắn cho Gia sư AI'}).fill('Từ này nghĩa là gì?');await page.getByRole('button',{name:'Gửi',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(2);expect(sent[1]).toMatchObject({screenId:'2',screenMode:'flashcard'});
});
for(const [path,kind,id] of [['/theory?lesson=1','theory','1'],['/reading?attempt=1','reading','1'],['/listening?session=7','listening','7'],['/curriculum?unit=f01','curriculum','f01']])test(`screen context is available at ${kind}`,async({page})=>{
 const {sent}=await fixture(page);await page.goto(path);
 if(kind==='reading')await page.getByRole('radio').first().check();
 if(kind==='listening')await page.getByRole('textbox',{name:'Câu trả lời Listening'}).fill('Office opens nine');
 await ask(page);await expect.poll(()=>sent.length).toBe(1);
 expect(sent[0]).toMatchObject({screenKind:kind,screenId:id,screenIndex:0});
 if(kind==='reading')expect(String(sent[0].screenResponse)).toContain('selected');
 if(kind==='listening')expect(String(sent[0].screenResponse)).toContain('Office opens nine');
});

test('switching cards cancels a pending answer instead of placing it under the new word',async({page},info)=>{
 const control=await fixture(page,true);await page.goto('/flashcards/1');await page.getByRole('button',{name:'Flashcard',exact:true}).click();
 await ask(page);await expect.poll(()=>control.sent.length).toBe(1);
 await page.getByRole('button',{name:'Thẻ tiếp',exact:true}).click();
 await expect(page.getByRole('complementary',{name:'Gia sư AI'})).toContainText('meeting');
 await page.getByRole('textbox',{name:'Tin nhắn cho Gia sư AI'}).fill('Từ này dùng thế nào?');await page.getByRole('button',{name:'Gửi',exact:true}).click();
 await expect.poll(()=>control.sent.length).toBe(2);expect(control.sent[1]).toMatchObject({screenId:'2'});
 control.release();await expect(page.getByText('Đang giải thích đúng nội dung màn hình.',{exact:true})).toHaveCount(1);
 await page.screenshot({path:info.outputPath('contextual-word-tutor.png'),fullPage:false});
});
