import {test,expect} from '@playwright/test';

async function empty(page:any){await page.clock.install({time:new Date('2026-10-22T10:00:00Z')});await page.goto('./?preview=demo&date=2026-10-22&layout=installed&roster=empty');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Set up my schedule',exact:true}).first()).toBeVisible();}
for(const kind of ['rotating','fixed','manual'])test('Skipping the tutorial still supports '+kind+' setup',async({page},info)=>{
 await empty(page);await info.attach('empty-calendar',{body:await page.screenshot(),contentType:'image/png'});
 await page.getByRole('button',{name:'Set up my schedule',exact:true}).first().click();
 await expect(page.getByLabel('Roster name')).toHaveCount(0);
 if(kind==='manual'){
  await page.getByRole('button',{name:'I’ll add shifts myself',exact:false}).click();await page.getByRole('button',{name:'Open my calendar',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Add',exact:true}).filter({visible:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Shift');await expect(page.getByRole('dialog')).toContainText('Overtime');await expect(page.getByRole('dialog')).toContainText('Leave');await expect(page.getByRole('dialog')).toContainText('Note');
  await page.getByRole('button',{name:'Shift',exact:true}).click();await page.locator('.shift-palette').getByRole('button').filter({hasText:'Night'}).click();
  await expect(page.locator('[data-roster-date="2026-10-22"]')).toHaveAttribute('aria-label',/Night/);
 }else{
  if(kind==='fixed')await page.getByRole('button',{name:'Same shifts every week',exact:false}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.locator('.sequence-day')).toHaveCount(kind==='fixed'?7:6);
  await info.attach('choose-shifts',{body:await page.screenshot(),contentType:'image/png'});
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Start date',{exact:true}).fill('2026-10-22');
  await info.attach('start-date',{body:await page.screenshot(),contentType:'image/png'});await page.getByRole('button',{name:'Show my shifts',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for(const [date,name] of kind==='fixed'?[['22','Day'],['23','Day'],['24','Off'],['25','Off'],['26','Day']]:[['22','Day'],['23','Day'],['24','Night'],['25','Night'],['26','Off'],['27','Off'],['28','Day']])await expect(page.locator('[data-roster-date="2026-10-'+date+'"]')).toHaveAttribute('aria-label',new RegExp(name));
 }
 await info.attach('finished',{body:await page.screenshot(),contentType:'image/png'});
});

test('Sequence tools and custom shifts are reusable without a separate roster setup',async({page},info)=>{
 await empty(page);await page.getByRole('button',{name:'Set up my schedule',exact:true}).first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Change day 1',exact:true}).click();await page.getByRole('button',{name:'Duplicate day',exact:true}).click();await expect(page.locator('.sequence-day')).toHaveCount(7);
 await page.getByRole('button',{name:'Change day 1',exact:true}).click();await page.getByRole('button',{name:'Remove day',exact:true}).click();await expect(page.locator('.sequence-day')).toHaveCount(6);
 await page.getByText('Change shift times or add a custom shift',{exact:true}).click();await page.getByRole('button',{name:'Create a custom shift',exact:true}).click();
 await page.getByLabel('Shift name',{exact:true}).fill('Recovery');await page.getByRole('button',{name:'Save shift',exact:true}).click();
 await page.getByRole('button',{name:'Change day 1',exact:true}).click();await page.getByRole('group',{name:'Available shifts'}).getByRole('button',{name:/Recovery/}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Show my shifts',exact:true}).click();
 await expect(page.locator('[data-roster-date="2026-10-22"]')).toHaveAttribute('aria-label',/Recovery/);
 await page.getByRole('button',{name:'Add',exact:true}).filter({visible:true}).click();await page.getByRole('button',{name:'Shift',exact:true}).click();await expect(page.locator('.shift-palette')).toContainText('Recovery');
 await info.attach('reusable-custom-shift',{body:await page.screenshot(),contentType:'image/png'});
});

test('Stopping a repeating schedule preserves historical shifts',async({page},info)=>{
 await empty(page);await page.getByRole('button',{name:'Set up my schedule',exact:true}).first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Start date',{exact:true}).fill('2026-10-01');await page.getByRole('button',{name:'Show my shifts',exact:true}).click();
 const old=await page.locator('[data-roster-date="2026-10-20"]').getAttribute('aria-label');
 await page.locator('.mobile-nav').getByRole('button',{name:'Schedule',exact:true}).click();await page.locator('.pattern-card summary').click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Stop repeating',exact:true}).click();await page.locator('.mobile-nav').getByRole('button',{name:'Calendar',exact:true}).click();
 await expect(page.locator('[data-roster-date="2026-10-20"]')).toHaveAttribute('aria-label',old!);await expect(page.locator('[data-roster-date="2026-10-23"]')).not.toHaveAttribute('aria-label',/Day|Night|Off/);
 await info.attach('history-preserved',{body:await page.screenshot(),contentType:'image/png'});
});
