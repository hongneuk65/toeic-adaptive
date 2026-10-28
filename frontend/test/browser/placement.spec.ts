import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { PlacementSession } from '../../src/types/placement';

const question = (id: number) => ({id,part:5,content:`Choose the right word ${id}.`,optionA:'careful',optionB:'carefully',optionC:'care',optionD:'cared',stimulus:{version:1 as const,groupId:`g${id}`,questionPosition:1,documents:[]}});
function session(revision = 0): PlacementSession {
  return {id:41,status:'ACTIVE',revision,answeredCount:revision,minQuestions:30,maxQuestions:42,deadlineAt:new Date(Date.now()+2400000).toISOString(),goal:'BALANCED',targetScore:null,currentGroup:{key:`group-${revision}`,part:5,questions:[question(revision+1)],restSeconds:0},result:null,policyVersion:'placement-rules-v1',limitations:['Đánh giá sơ bộ; chưa phải phép đo chuẩn hóa.']};
}
const completed = (): PlacementSession => ({...session(2),status:'COMPLETED',currentGroup:null,result:{answered:2,correct:1,note:'Tiếp tục luyện để có thêm bằng chứng.',topics:[{skillId:1,skillName:'Loại từ',part:5,attempts:2,correct:1,independentGroups:2,status:'insufficient'}],recommendations:[{label:'Củng cố kiến thức',href:'/theory'}]}});
async function mock(page: Page, options: { active?: PlacementSession; available?: boolean; unavailableReason?: string; loseFirstAnswer?: boolean } = {}) {
  let current = options.active ?? session();
  let started = !!options.active;
  let loseResponse = options.loseFirstAnswer ?? false;
  const submitted: unknown[] = [];
  let preferences = {goal:'BALANCED',targetScore:null as number|null};
  await page.addInitScript(()=>localStorage.setItem('accessToken','fixture'));
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/auth/me'))return route.fulfill({json:{id:1,email:'fixture@example.invalid',role:'USER'}});
    if(path.endsWith('/placement/overview'))return route.fulfill({json:{preferences,active:started && current.status==='ACTIVE'?current:null,latest:current.status==='COMPLETED'?current:null,catalog:{available:options.available??true,reason:options.unavailableReason,byPart:Array.from({length:7},(_,i)=>({part:i+1,groups:30}))}}});
    if(path.endsWith('/placement/preferences')){preferences=route.request().postDataJSON();return route.fulfill({json:preferences});}
    if(path.endsWith('/placement/start')){started=true;return route.fulfill({json:current});}
    if(path.endsWith('/placement/41/answer')){
      submitted.push(route.request().postDataJSON());
      current=current.revision===0?session(1):completed();
      if(loseResponse){loseResponse=false;return route.abort('failed');}
      return route.fulfill({json:current});
    }
    if(path.endsWith('/placement/41'))return route.fulfill({json:current});
    return route.fulfill({json:[]});
  });
  return {submitted,getPreferences:()=>preferences};
}

test('saves aspiration separately, adapts through groups and shows cautious results',async({page},info)=>{
  const api=await mock(page);
  await page.goto('/placement');
  await page.getByRole('radio',{name:/Củng cố nền tảng/}).check();
  await page.getByRole('spinbutton',{name:/Điểm TOEIC mục tiêu/}).fill('650');
  await page.getByRole('button',{name:'Lưu mục tiêu học'}).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu mục tiêu.');
  expect(api.getPreferences()).toEqual({goal:'FOUNDATION',targetScore:650});
  await page.getByRole('button',{name:'Bắt đầu đánh giá',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Part 5 · Câu 1'})).toBeFocused();
  await expect(page.getByRole('button',{name:'Mở Gia sư AI'})).toHaveCount(0);
  await page.getByRole('group',{name:/Choose the right word 1/}).evaluate(element=>{
    const selection=window.getSelection();
    const range=document.createRange();range.selectNodeContents(element);selection?.removeAllRanges();selection?.addRange(range);
    document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
  });
  await expect(page.locator('[data-selection-vocabulary]')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Gửi và tiếp tục'})).toBeDisabled();
  await page.getByRole('radio',{name:'B carefully'}).check();
  await page.getByRole('button',{name:'Gửi và tiếp tục'}).click();
  await expect(page.getByRole('heading',{name:'Part 5 · Câu 2'})).toBeFocused();
  expect(api.submitted[0]).toEqual({revision:0,answers:[{questionId:1,selectedAnswer:'B'}]});
  await page.getByRole('radio',{name:'A careful'}).check();
  await page.getByRole('button',{name:'Gửi và tiếp tục'}).click();
  await expect(page.getByRole('heading',{name:'Nội dung nên học tiếp'})).toBeVisible();
  await expect(page.getByText('Chưa đủ dữ liệu',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Củng cố kiến thức →'})).toHaveAttribute('href','/theory');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.locator('body').evaluate(el=>el.clientWidth));
  await page.screenshot({path:info.outputPath('placement-results.png'),fullPage:true});
});

test('server group and local draft survive refresh; lost acknowledgement reconciles without duplicate answer',async({page})=>{
  const api=await mock(page,{active:session(),loseFirstAnswer:true});
  await page.goto('/placement');
  await page.getByRole('radio',{name:'B carefully'}).check();
  await page.reload();
  await expect(page.getByRole('radio',{name:'B carefully'})).toBeChecked();
  await page.getByRole('button',{name:'Gửi và tiếp tục'}).click();
  await expect(page.getByRole('heading',{name:'Part 5 · Câu 2'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Đã tải trạng thái mới nhất');
  expect(api.submitted).toHaveLength(1);
});

test('unavailable bank explains why a new assessment cannot start',async({page})=>{
  await mock(page,{available:false,unavailableReason:'Chưa đủ nhóm câu đã kiểm tra.'});
  await page.goto('/placement');
  await expect(page.getByText('Chưa đủ nhóm câu đã kiểm tra.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Bắt đầu đánh giá',exact:true})).toBeDisabled();
});

test('overview error offers a retry',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('accessToken','fixture'));
  await page.route('**/api/**',route=>new URL(route.request().url()).pathname.endsWith('/auth/me')?route.fulfill({json:{id:1,role:'USER'}}):route.fulfill({status:503,json:{message:'Đang bảo trì bài đánh giá'}}));
  await page.goto('/placement');
  await expect(page.getByRole('alert')).toContainText('Đang bảo trì bài đánh giá');
  await expect(page.getByRole('button',{name:'Thử lại'})).toBeVisible();
});

test('expired attempts preserve answered work and offer another attempt',async({page})=>{
  await mock(page,{active:{...session(),status:'EXPIRED',currentGroup:null}});
  // Overview normally returns only active sessions. Start's returned expiry is
  // also handled because a deadline can pass while the request is in flight.
  await page.goto('/placement');
  await page.getByRole('button',{name:'Bắt đầu đánh giá',exact:true}).click();
  await expect(page.getByText(/Lượt đánh giá đã hết thời gian/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Bắt đầu lượt đánh giá mới'})).toBeVisible();
});

test('listening rest and draft survive refresh before group submission unlocks',async({page})=>{
  await page.clock.install();
  const listening: PlacementSession = {...session(),currentGroup:{key:'listening-1',part:3,restSeconds:5,questions:[1,2,3].map(id=>({...question(id),part:3,audioUrl:'/fixture-audio.mp3',stimulus:{version:1,groupId:'conversation',questionPosition:id,documents:[]}}))}};
  await mock(page,{active:listening});
  await page.addInitScript(()=>{
    const key='exam-listening:41:audio:placement-listening-1';
    if(!sessionStorage.getItem(key))sessionStorage.setItem(key,JSON.stringify({position:30,completed:false,audioEnded:true,restDeadlineMs:Date.now()+5000}));
  });
  await page.goto('/placement');
  await expect(page.getByText('Thời gian chọn đáp án',{exact:true})).toBeVisible();
  const choices=page.getByRole('radio',{name:'B carefully'});
  for(let i=0;i<3;i++)await choices.nth(i).check();
  await expect(page.getByRole('button',{name:'Gửi và tiếp tục'})).toBeDisabled();
  const deadline=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('exam-listening:41:audio:placement-listening-1')!).restDeadlineMs);
  await page.clock.runFor(1000);
  await page.reload();
  await expect(choices.nth(0)).toBeChecked();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('exam-listening:41:audio:placement-listening-1')!).restDeadlineMs)).toBe(deadline);
  await page.clock.runFor(5000);
  await expect(page.getByRole('button',{name:'Gửi và tiếp tục'})).toBeEnabled();
});

test('deadline expiry reconciles server state without posting invented wrong answers',async({page})=>{
  await page.clock.install();
  const active={...session(),deadlineAt:new Date(Date.now()+10000).toISOString()};
  const api=await mock(page,{active});
  await page.route('**/api/placement/41',route=>route.fulfill({json:{...active,status:'EXPIRED',currentGroup:null}}));
  await page.goto('/placement');
  await expect(page.getByRole('heading',{name:'Part 5 · Câu 1'})).toBeVisible();
  await page.clock.runFor(11000);
  await expect(page.getByText(/Lượt đánh giá đã hết thời gian/)).toBeVisible();
  expect(api.submitted).toHaveLength(0);
});

test('pending reference is manually refreshed into an internal expected count with version warning',async({page})=>{
  const pending: PlacementSession={...completed(),reference:{status:'pending',note:'Đang đồng bộ lịch sử trả lời.'}};
  await mock(page,{active:pending});
  await page.route('**/api/placement/41',route=>route.fulfill({json:{...pending,reference:{status:'ready',note:'Phạm vi câu hỏi đã được model hỗ trợ.',version:'fixture-v1',itemCount:100,expectedCorrect:62.4,byPart:[{part:5,itemCount:100,expectedCorrect:62.4}]}}}));
  await page.goto('/placement');
  await page.getByRole('button',{name:'Cập nhật kết quả tham chiếu'}).click();
  const reference=page.getByRole('region',{name:'Bộ tham chiếu nội bộ'});
  await expect(reference).toContainText('62,4 / 100 câu');
  await expect(reference).toContainText('fixture-v1');
  await expect(reference).toContainText('Chỉ so sánh các lần dùng cùng phiên bản');
});
