import {test,expect,type Page} from '@playwright/test';

async function expectPhoneFrame(page:Page){
 await expect(page.locator('.mobile-nav')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>{
  const bar=document.querySelector('.mobile-nav')!.getBoundingClientRect();
  const shell=document.querySelector('.app-shell')!.getBoundingClientRect();
  return {gap:Math.round(innerHeight-bar.bottom),frameGap:Math.round(innerHeight-shell.bottom),overflow:document.documentElement.scrollWidth>innerWidth+1,scroll:document.documentElement.scrollHeight>innerHeight+1};
 })).toEqual({gap:0,frameGap:0,overflow:false,scroll:false});
}

for(const layout of ['installed','browser']){
 test(layout+' calendar, Today and Patterns fit the phone',async({page},info)=>{
  await page.goto('./?preview=demo&date=2026-10-19&layout='+layout+'&theme=light');
  await expectPhoneFrame(page);
  await expect(page.locator('.calendar-cell')).toHaveCount(35);
  await page.getByRole('button',{name:'Next month',exact:true}).click();
  await expect(page.locator('.calendar-cell')).toHaveCount(42);
  const calendar=await page.locator('.calendar').boundingBox(),nav=await page.locator('.mobile-nav').boundingBox();
  expect(calendar!.y+calendar!.height).toBeLessThan(nav!.y);
  await info.attach('six-week-calendar',{body:await page.screenshot(),contentType:'image/png'});
  for(const tab of ['Today','Patterns']){
   await page.locator('.mobile-nav').getByRole('button',{name:tab,exact:true}).click();
   await expectPhoneFrame(page);
   await expect(page.getByRole('heading',{name:tab,exact:true})).toBeVisible();
   await info.attach(tab.toLowerCase(),{body:await page.screenshot(),contentType:'image/png'});
  }
  await expect(page.getByRole('heading',{name:'Your roster is already planned',exact:true})).toBeVisible();
  await page.locator('summary').filter({hasText:'Use a preset pattern'}).click();
  const last=page.locator('.templates>button').last();
  await page.locator('.content').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await expect(last).toBeVisible();
  const end=await last.boundingBox(),bar=await page.locator('.mobile-nav').boundingBox();
  expect(end!.y+end!.height).toBeLessThanOrEqual(bar!.y+1);
  await expectPhoneFrame(page);
 });
}

test('installed app keeps its full frame with a shorter visual viewport',async({page},info)=>{
 await page.goto('./?preview=demo&date=2026-10-19&layout=installed&reducedViewport=true&theme=dark');
 await expectPhoneFrame(page);
 await expect(page.locator('html')).toHaveAttribute('data-standalone','true');
 await info.attach('reduced-viewport-dark',{body:await page.screenshot(),contentType:'image/png'});
});

test('review monitor detects an introduced bottom gap',async({page})=>{
 await page.goto('./ui-review.html');
 const frame=page.frameLocator('iframe');
 await expect(frame.locator('.mobile-nav')).toBeVisible();
 await expect(page.locator('#layout-status')).toContainText('bottom gap 0px');
 // Deliberately reproduce the original failure in this isolated sample only.
 const app=page.frames().find(f=>f.url().includes('preview=demo'))!;
 await app.addStyleTag({content:'.app-shell{height:calc(100% - 62px)!important}'});
 await expect(page.locator('#layout-status')).toContainText('LAYOUT ERROR');
 await expect(page.locator('#layout-status')).toContainText('bottom gap 62px');
});
