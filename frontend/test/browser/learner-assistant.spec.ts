import { test,expect } from '@playwright/test';
for(const path of ['/flashcards','/reading','/recommendations']) {
 test(`personal assistant sends the current page on ${path}`,async({page})=>{
   let sent:Record<string,unknown>|undefined;
   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>localStorage.setItem('accessToken','fixture'));
   await page.route('**/api/**',route=>{
     const url=new URL(route.request().url());
     if(url.pathname.endsWith('/auth/me'))return route.fulfill({json:{id:1,role:'USER'}});
     if(url.pathname.endsWith('/rag/chat-history'))return route.fulfill({json:[]});
     if(url.pathname.endsWith('/rag/chat-stream')){sent=route.request().postDataJSON();return route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({chunk:'Gợi ý từ hồ sơ: luyện thì động từ.'})+'\n\ndata: [DONE]\n\n'});}
     if(url.pathname.endsWith('/mastery/me'))return route.fulfill({json:{skills:[],topicGroups:[]}});
     if(url.pathname.endsWith('/reading'))return route.fulfill({json:{articles:[],attempts:[],limits:{maxText:10000,maxQuestions:5,generations:5,tutorCalls:10}}});
     if(url.pathname.endsWith('/mastery/activities'))return route.fulfill({json:{sections:{theory:[],vocabulary:[],reading:[],listening:[]}}});
     return route.fulfill({json:[]});
   });
   await page.goto(path);
   await page.getByRole('button',{name:'Mở Gia sư AI',exact:true}).click();
   await page.getByRole('button',{name:'Hôm nay mình nên học gì?',exact:true}).click();
   await expect.poll(()=>sent?.pagePath).toBe(path);
   expect(sent).not.toHaveProperty('userId');
   await expect(page.getByText('Gợi ý từ hồ sơ: luyện thì động từ.',{exact:true})).toBeVisible();
   expect(errors).toEqual([]);
 });
}
