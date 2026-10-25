import { test, expect, type Page } from '@playwright/test';
const settings = { defaultSegmentSeconds: 180, maxSegmentSeconds: 300, maxRecordingSeconds: 60 };
const source = { id: 9, title: 'Office listening', kind: 'AUDIO', url: '/fixture.mp3', videoId: null, ownerId: null, published: true };
async function fixture(page: Page, mode = 'normal') {
  let unavailable = mode === 'error';
  let stage = mode === 'starter' ? 'unassessed' : 'foundation';
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/auth/me') return json({ id: 1, role: 'USER', email: 'fixture@example.invalid' });
    if (path === '/auth/google/config') return json({ enabled: false });
    if (path === '/mastery/activities') {
      if (unavailable) return json({message:'unavailable'}, 503);
      const item = (key: string, href: string) => Array.from({length:4}, (_,i) => ({id:key+i,title:key+' suggestion '+i,href,reason: stage === 'unassessed' ? 'Bắt đầu để tìm nội dung phù hợp với bạn' : 'Củng cố phần cần luyện',evidence: stage === 'unassessed' ? 'starter' : 'das3h',priority:stage === 'unassessed' ? 'diagnostic' : 'focus'}));
      return json({generatedAt:'2026-10-23T00:00:00Z',learnerProfile:{stage,label:stage === 'unassessed' ? 'Đang tìm điểm bắt đầu' : 'Củng cố nền tảng',description:stage === 'unassessed' ? 'Chưa đủ kết quả để xác định phần cần củng cố. Hãy khám phá một bài học.' : 'Ưu tiên nền tảng theo kết quả luyện tập đã ghi nhận.',observedSkills:stage === 'unassessed' ? 0 : 4,practiceCount:stage === 'unassessed' ? 0 : 20},sections: mode === 'empty' ? {} : {theory:item('theory','/theory?lesson=1'),vocabulary:item('vocabulary','/flashcards/1'),reading:item('reading','/reading?article=1'),listening:item('listening','/listening?source=9')}});
    }
    if (path === '/theory/catalog') return json([]);
    if (path === '/theory/1') return json({id:1,title:'Grammar lesson',content:'Grammar content',part:5,skill:{name:'Grammar',code:'GRAMMAR'}});
    if (path === '/mastery/me') return json({skills:[],topicGroups:[],learningPlan:{items:[]}});
    if (path === '/flashcards/folders') return json([]);
    if (path === '/flashcards/folders/1') return json({id:1,name:'Office vocabulary',isOwner:false});
    if (path === '/flashcards/folders/1/cards') return json([{id:1,word:'office',meaning:'văn phòng'}]);
    if (path === '/flashcards/folders/1/reviews') return json([{cardId:1,known:false,reviewCount:2,memory: mode === 'self' ? {probability:null,halfLifeDays:null,source:'self_report',estimated:false,lastPracticedAt:null} : {probability:.8,halfLifeDays:3,source:'hlr-prior-experimental',estimated:true,lastPracticedAt:'2026-10-22T00:00:00Z'}}]);
    if (path === '/reading') return json({articles:[],attempts:[],limits:{maxText:10000,maxQuestions:5,generations:5,tutorCalls:10}});
    if (path === '/listening') return json({sources:[source],sessions:[],settings,asrAvailable:false});
    if (path === '/listening/sources/9') return json({source,transcript:null});
    if (path === '/listening/sessions/7') return json({id:7,sourceId:9,source,start:0,end:180,currentIndex:0,totalUnits:0,unit:null,mode:'DICTATION',difficulty:'EASY',settings});
    return json({message:'not mocked'},404);
  });
  return {recover: () => { unavailable = false; }, progress: () => { stage = 'foundation'; }};
}
for (const [route, section] of [['/theory','theory'],['/flashcards','vocabulary'],['/reading','reading'],['/listening','listening']]) {
 test('module recommendations '+section, async ({page}) => {
  await fixture(page); await page.goto(route);
  await expect(page.getByRole('heading',{name:'Gợi ý học cho bạn',exact:true})).toBeVisible();
  const compact = section === 'reading' || section === 'listening';
  if (compact) await expect(page.getByText('Củng cố nền tảng',{exact:true})).toHaveCount(0);
  else await expect(page.getByText('Củng cố nền tảng',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:new RegExp('^'+section+' suggestion ')})).toHaveCount(compact ? 2 : 3);
  await expect(page.getByRole('link',{name:section+' suggestion 0',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:section+' suggestion 3',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:section+' suggestion 0',exact:true})).toHaveAttribute('href', /\//);
 });
}

test('unassessed profile offers a real starting lesson without a weakness claim', async ({page}, testInfo) => {
 await fixture(page,'starter'); await page.goto('/theory');
 const suggestions = page.getByRole('region',{name:'Gợi ý học cho bạn',exact:true});
 await expect(suggestions.getByText('Đang tìm điểm bắt đầu',{exact:true})).toBeVisible();
 await expect(suggestions.getByText('Bắt đầu / Khám phá',{exact:true})).toHaveCount(3);
 await expect(suggestions).not.toContainText('Củng cố phần cần luyện');
 await expect(suggestions.getByRole('link',{name:'theory suggestion 0',exact:true})).toHaveAttribute('href','/theory?lesson=1');
 await page.screenshot({path:testInfo.outputPath('module-starting-suggestions.png'),fullPage:true});
 await suggestions.getByRole('link',{name:'theory suggestion 0',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Grammar lesson',exact:true})).toBeVisible();
});

for (const event of ['focus','learning-progress-updated']) test('suggestions refresh after '+event, async ({page}) => {
 const control = await fixture(page,'starter'); await page.goto('/flashcards');
 await expect(page.getByText('Đang tìm điểm bắt đầu',{exact:true})).toBeVisible();
 control.progress(); await page.evaluate(name => window.dispatchEvent(new Event(name)),event);
 await expect(page.getByText('Củng cố nền tảng',{exact:true})).toBeVisible();
 await expect(page.getByText('Đang tìm điểm bắt đầu',{exact:true})).toHaveCount(0);
});
test('hub offers every module', async ({page}, testInfo) => { await fixture(page); await page.goto('/recommendations'); for(const key of ['theory','vocabulary','reading','listening']) await expect(page.getByRole('link',{name:key+' suggestion 0',exact:true})).toBeVisible(); await page.screenshot({path:testInfo.outputPath('integrated-hub.png'),fullPage:true}); });
test('suggestion failure remains nonblocking and retries', async ({page}) => { const control = await fixture(page,'error'); await page.goto('/theory'); await expect(page.getByRole('heading',{name:'Tất cả bài học',exact:true})).toBeVisible(); await expect(page.getByRole('button',{name:'Thử lại gợi ý'})).toBeVisible(); control.recover(); await page.getByRole('button',{name:'Thử lại gợi ý'}).click(); await expect(page.getByRole('link',{name:'theory suggestion 0',exact:true})).toBeVisible(); });
test('empty recommendations explain next step', async ({page}) => { await fixture(page,'empty'); await page.goto('/flashcards'); await expect(page.getByText('Chưa có bài phù hợp để gợi ý. Hãy chọn bài trong thư viện để bắt đầu.')).toBeVisible(); });
test('same route listening suggestion opens source without session creation', async ({page}) => { await fixture(page); const writes: string[]=[]; page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());}); await page.goto('/listening'); await page.getByRole('link',{name:'listening suggestion 0',exact:true}).click(); await expect(page.getByRole('heading',{name:'Office listening',exact:true})).toBeVisible(); await expect(page.getByRole('link',{name:'listening suggestion 0',exact:true})).toHaveCount(0); expect(writes).toEqual([]); });
test('session takes precedence and unsafe source is ignored', async ({page}) => { await fixture(page); await page.goto('/listening?source=9&session=7'); await expect(page.getByRole('heading',{name:'Office listening',exact:true})).toBeVisible(); await expect(page.getByRole('link',{name:'listening suggestion 0',exact:true})).toHaveCount(0); await page.goto('/listening?source=-9'); await expect(page.getByRole('link',{name:'listening suggestion 0',exact:true})).toBeVisible(); });
test('typed recall memory shows experimental curve', async ({page}, testInfo) => { await fixture(page); await page.goto('/flashcards/1'); await expect(page.getByRole('heading',{name:'Đường cong ghi nhớ · ước tính thử nghiệm'})).toBeVisible(); await expect(page.getByText(/Khả năng nhớ ước tính hiện tại: 80%/)).toBeVisible(); await expect(page.getByRole('img',{name:/Dự báo khả năng nhớ giảm/})).toBeVisible(); await page.screenshot({path:testInfo.outputPath('vocabulary-memory.png'),fullPage:true}); });
test('self assessment has no fabricated memory probability', async ({page}) => { await fixture(page,'self'); await page.goto('/flashcards/1'); await expect(page.getByRole('heading',{name:'Office vocabulary',exact:true})).toBeVisible(); await expect(page.getByRole('region',{name:'Ước tính ghi nhớ từ vựng'})).toHaveCount(0); });

test('memory projection ages without polling the reviews endpoint', async ({page}) => {
 await page.clock.install({time:new Date('2026-10-23T00:00:00Z')});
 await fixture(page); let reads=0; page.on('request',request=>{if(request.url().includes('/folders/1/reviews')) reads++;});
 await page.goto('/flashcards/1'); await expect(page.getByText(/Khả năng nhớ ước tính hiện tại: 80%/)).toBeVisible();
 const initialReads = reads; await page.clock.fastForward(86400000);
 await expect(page.getByText(/Khả năng nhớ ước tính hiện tại: 63%/)).toBeVisible(); expect(reads).toBe(initialReads);
});
