import {test,expect,type Page,type TestInfo} from '@playwright/test';

async function openCalendar(page:Page,date:string,roster='dates',theme='light'){
 await page.goto(`./?preview=demo&date=${date}&layout=installed&theme=${theme}&roster=${roster}`);
 await expect(page.locator('.calendar-screen .month-grid')).toBeVisible();
 await expect(page.locator('.mobile-nav')).toBeVisible();
}

async function attach(page:Page,info:TestInfo,name:string){
 await info.attach(name,{body:await page.screenshot(),contentType:'image/png'});
}

async function calendarMetrics(page:Page){
 return page.evaluate(()=>{
  const grid=document.querySelector('.calendar-screen .month-grid') as HTMLElement;
  const cells=[...document.querySelectorAll('.calendar-screen .month-grid > .calendar-cell')] as HTMLElement[];
  const peek=document.querySelector('.calendar-screen .phone-day-peek') as HTMLElement;
  const nav=document.querySelector('.calendar-screen .mobile-nav') as HTMLElement;
  const navButtons=[...nav.querySelectorAll('button')] as HTMLElement[];
  const firstDuty=document.querySelector('.calendar-screen .calendar-cell .cell-shift') as HTMLElement|null;
  return {
   cellCount:cells.length,
   gridHeight:grid.getBoundingClientRect().height,
   cellHeight:cells[0]?.getBoundingClientRect().height||0,
   peekHeight:peek.getBoundingClientRect().height,
   navHeight:nav.getBoundingClientRect().height,
   minNavTap:Math.min(...navButtons.map(button=>button.getBoundingClientRect().height)),
   dutyFont:firstDuty?parseFloat(getComputedStyle(firstDuty).fontSize):0,
   pageScrollable:document.documentElement.scrollHeight>innerHeight+1||document.body.scrollHeight>innerHeight+1,
   frameBottom:nav.getBoundingClientRect().bottom,
   viewportHeight:innerHeight
  };
 });
}

test('five-row months breathe more while six-row months stay fully visible',async({page},info)=>{
 await openCalendar(page,'2026-10-19');
 const five=await calendarMetrics(page);
 expect(five.cellCount).toBe(35);
 expect(five.pageScrollable).toBe(false);
 expect(five.minNavTap).toBeGreaterThanOrEqual(44);
 expect(five.frameBottom).toBeLessThanOrEqual(five.viewportHeight+1);
 await attach(page,info,'adaptive-five-row-month');

 await openCalendar(page,'2026-08-19');
 const six=await calendarMetrics(page);
 expect(six.cellCount).toBe(42);
 expect(six.pageScrollable).toBe(false);
 expect(six.minNavTap).toBeGreaterThanOrEqual(44);
 expect(six.frameBottom).toBeLessThanOrEqual(six.viewportHeight+1);
 expect(five.cellHeight).toBeGreaterThan(six.cellHeight);
 if(page.viewportSize()!.height>=601)expect(five.dutyFont).toBeGreaterThan(six.dutyFont);
 await attach(page,info,'adaptive-six-row-month');
});

test('selected-date inspector adapts without pushing navigation away',async({page},info)=>{
 await openCalendar(page,'2026-10-19','empty');
 const quiet=await calendarMetrics(page);
 await attach(page,info,'adaptive-quiet-date');

 await openCalendar(page,'2026-10-19','stress','dark');
 const busy=await calendarMetrics(page);
 if(page.viewportSize()!.height>=601)expect(busy.peekHeight).toBeGreaterThan(quiet.peekHeight);
 expect(busy.pageScrollable).toBe(false);
 expect(busy.minNavTap).toBeGreaterThanOrEqual(44);
 expect(busy.frameBottom).toBeLessThanOrEqual(busy.viewportHeight+1);
 const duty=page.locator('.phone-peek-duty > span');
 await expect(duty).toBeVisible();
 expect(await duty.evaluate(el=>el.scrollWidth>=el.clientWidth)).toBe(true);
 await attach(page,info,'adaptive-busy-date');
});
