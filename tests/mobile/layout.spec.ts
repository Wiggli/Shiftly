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
 test(layout+' four-row month uses the full phone frame',async({page},info)=>{
  await page.goto('./?preview=demo&date=2027-02-15&layout='+layout+'&theme=dark&roster=rotation');
  await expectPhoneFrame(page);
  await expect(page.locator('.calendar-cell')).toHaveCount(28);
  const calendar=await page.locator('.calendar').boundingBox(),bar=await page.locator('.mobile-nav').boundingBox();
  expect(calendar!.y+calendar!.height).toBeLessThan(bar!.y);
  await info.attach('four-row-month-'+layout,{body:await page.screenshot(),contentType:'image/png'});
 });
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
 const fault=await app.addStyleTag({content:'.app-shell{height:calc(100% - 62px)!important;min-height:0!important}.app-shell>.workspace{height:100%!important;min-height:0!important}'});
 // Verify the fault really took effect even when the app gains new viewport safeguards.
 await expect.poll(()=>app.evaluate(()=>Math.round(innerHeight-document.querySelector(".mobile-nav")!.getBoundingClientRect().bottom))).toBe(62);
 await expect(page.locator('#layout-status')).toContainText('LAYOUT ERROR');
 await expect(page.locator('#layout-status')).toContainText('bottom gap 62px');
 await fault.evaluate(el=>(el as Element).remove());
 await expect(page.locator('#layout-status')).toContainText('Layout check passed');
});

for(const theme of ['light','dark']){
 test(theme+' week uses readable rows, weekly hours and seven-day navigation',async({page},info)=>{
  await page.goto('./?preview=demo&date=2026-10-19&layout=installed&theme='+theme);
  await page.getByRole('button',{name:'Week',exact:true}).click();
  await expect(page.locator('.week-calendar .calendar-cell')).toHaveCount(7);
  await expect(page.locator('.phone-month-name')).toHaveText('19–25 Oct');
  // The 24 Oct night duty spans Malta's 2026 autumn clock change and lasts 13 elapsed hours.
  await expect(page.getByRole('button',{name:'Weekly summary and scheduled hours'})).toContainText('61h');
  await expectPhoneFrame(page);
  const rows=await page.locator('.week-calendar .calendar-cell').all();
  const first=await rows[0].boundingBox(),second=await rows[1].boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y);
  expect(Math.abs(second!.x-first!.x)).toBeLessThan(1);
  expect(first!.height).toBeLessThan(130);
  await expect(rows[0]).toContainText('07:00–19:00');
  // Neutral Week rows must not inherit white text from a dark duty colour.
  const dateInk=await rows[0].locator('.date-label').evaluate(el=>getComputedStyle(el).color);
  expect(dateInk).not.toBe('rgb(255, 255, 255)');
  await expect(rows[1]).toContainText('19:00–07:00');
  await expect(rows[1]).toContainText('+1 day');
  await rows[2].click();
  // WebKit includes locale punctuation here while Chromium may not. Check the date parts, not punctuation.
  await expect(page.locator('.phone-day-peek')).toContainText(/Wed,?\s+21 Oct/);
  await page.getByRole('button',{name:'Next week',exact:true}).click();
  await expect(page.locator('.phone-month-name')).toHaveText('26 Oct–1 Nov');
  await page.getByRole('button',{name:'Previous week',exact:true}).click();
  await expect(page.locator('.phone-month-name')).toHaveText('19–25 Oct');
  if(page.viewportSize()!.height>600){
   const last=await rows[6].boundingBox(),calendar=await page.locator('.week-calendar').boundingBox();
   expect(last!.y+last!.height).toBeLessThanOrEqual(calendar!.y+calendar!.height+1);
  }
  await info.attach('week-'+theme,{body:await page.screenshot(),contentType:'image/png'});
 });
}
