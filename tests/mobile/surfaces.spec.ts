import {test,expect,type Page,type TestInfo} from '@playwright/test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import IPhoneCalendarSetup from '../../app/ui/IPhoneCalendarSetup';
import {calendarProfile} from '../../lib/caldav-profile';
import {readFile} from 'node:fs/promises';

async function openSample(page:Page,theme='light',roster='dates'){
 await page.goto('./?preview=demo&date=2026-10-19&layout=installed&theme='+theme+'&roster='+roster);
 await expect(page.locator('.mobile-nav')).toBeVisible();
}
async function inspectSurface(page:Page,info:TestInfo,name:string){
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const sheet=page.getByRole('dialog');
 if(await sheet.count()){
  await expect(sheet).toBeVisible();
  await expect.poll(async()=>{const rect=await sheet.boundingBox();return !!rect&&rect.y>=-1&&rect.y+rect.height<=page.viewportSize()!.height+1;}).toBe(true);
  const box=await sheet.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(-1);expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  expect(box!.y+box!.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);
  await expect(sheet.getByRole('button',{name:'Close',exact:true})).toBeVisible();
  const title=await sheet.locator(':scope > header h2').boundingBox(),close=await sheet.getByRole('button',{name:'Close',exact:true}).boundingBox();
  expect(title!.x+title!.width).toBeLessThanOrEqual(close!.x+1);
  const smallInputs=await sheet.locator('input:not([type=checkbox]):not([type=radio]),textarea,select').evaluateAll(elements=>elements.filter(el=>parseFloat(getComputedStyle(el).fontSize)<16).length);
  expect(smallInputs).toBe(0);
 }
 await info.attach(name,{body:await page.screenshot(),contentType:'image/png'});
}
async function more(page:Page){await page.locator('.mobile-nav').getByRole('button',{name:'More',exact:true}).click();}

test('A failed account module shows recovery instead of a blank app',async({page},info)=>{
 await page.route('**/assets/runtime-*.js',route=>route.abort());
 await page.goto('./');
 await expect(page.getByRole('status')).toContainText('Shiftly could not finish opening');
 await inspectSurface(page,info,'startup-recovery');
 await page.unroute('**/assets/runtime-*.js');
 await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.locator('.mobile-nav')).toBeVisible();
});

test('Week hours open the same seven-day totals instead of the full month',async({page},info)=>{
 await openSample(page);await page.getByRole('button',{name:'Week',exact:true}).click();
 const summary=page.getByRole('button',{name:'Weekly summary and scheduled hours',exact:true});
 const hours=(await summary.innerText()).replace('h','');await summary.click();
 await expect(page.locator('.insights-period')).toHaveText('19 Oct 2026 – 25 Oct 2026');
 await expect(page.locator('.stat-grid article').filter({hasText:'Planned duty hours'}).locator('strong')).toHaveText(Number(hours).toFixed(1));
 await expect(page.locator('.insights-annotations')).toContainText('4.0 overtime hours');
 await expect(page.locator('.stat-grid article').filter({hasText:'Leave days'}).locator('strong')).toHaveText('1');
 await inspectSurface(page,info,'weekly-hours');
 await page.getByRole('button',{name:'This month',exact:true}).click();
 await expect(page.locator('.insights-period')).toHaveText('1 Oct 2026 – 31 Oct 2026');
});

test('Linked patterns show cycle status, preserve manual duties and explain an end date',async({page},info)=>{
 await page.clock.install({time:new Date('2026-10-20T10:00:00Z')});
 await openSample(page,'dark','rotation');
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Paint',exact:true}).click();
 await page.getByRole('button',{name:'Paint Off',exact:true}).click();await page.locator('[data-roster-date="2026-10-19"]').click();
 await page.locator('.phone-edit-bar').getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.locator('[data-roster-date="2026-10-19"]')).toHaveAttribute('aria-label',/Off/);
 await page.locator('.mobile-nav').getByRole('button',{name:'Schedule',exact:true}).click();
 await expect(page.locator('.pattern-state')).toHaveText('Active today');
 await expect(page.locator('.pattern-cycle-position')).toContainText('Next cycle');
 await inspectSurface(page,info,'pattern-status');
 await page.getByRole('button',{name:'Edit schedule',exact:true}).click();await page.getByRole('dialog',{name:'Change my schedule'}).getByText('More options',{exact:true}).click();await page.getByRole('button',{name:'Edit the original schedule',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Repeat',{exact:true}).selectOption('until');await page.getByLabel('End date',{exact:true}).fill('2026-10-19');
 await page.getByRole('button',{name:'Save schedule',exact:true}).click();
 await expect(page.locator('.pattern-state')).toHaveText('Finished');await expect(page.locator('.toast')).toHaveText('Schedule updated');await inspectSurface(page,info,'pattern-finished');
 await page.locator('.mobile-nav').getByRole('button',{name:'Calendar',exact:true}).click();
 await expect(page.locator('[data-roster-date="2026-10-19"]')).toHaveAttribute('aria-label',/Off/);
 await expect(page.locator('.phone-day-peek')).toContainText('Extra evening hours');
});

for(const theme of ['light','dark']){
 test(theme+' iPhone setup prefills Shiftly without downloading a password',async({page,browserName},info)=>{
  await openSample(page,theme);
  const styles=await page.locator('link[rel=stylesheet]').evaluateAll(elements=>elements.map(el=>el.outerHTML).join(''));
  const address='https://fixture.invalid/functions/v1/shiftly-api/api/caldav/s0123456789abcdef01234567/';
  // Render the actual stateless setup component with fictional credentials.
  // No signed-in identity, account lookup or production mutation is involved.
  const component=renderToStaticMarkup(React.createElement(IPhoneCalendarSetup,{address}));
  await page.setContent('<html data-theme="'+theme+'"><head>'+styles+'</head><body><div class="app-shell"><div class="workspace"><div class="content"><main class="full-main"><section class="settings-panel">'+component+'</section></main></div></div></div></body></html>');
  const link=page.getByRole('link',{name:'Download iPhone setup',exact:true});
  await expect(link).toHaveAttribute('href',/\/setup\/caldav\/s0123456789abcdef01234567\.mobileconfig$/);
  await inspectSurface(page,info,'iphone-setup-'+theme);
  await page.getByText('Already connected? Rename your existing account',{exact:true}).click();
  await expect(page.getByText(/change Description to Shiftly/)).toBeVisible();
  await inspectSurface(page,info,'rename-existing-'+theme);
  const profile=await calendarProfile(address);
  const parsed=await page.evaluate(xml=>{const doc=new DOMParser().parseFromString(xml,'application/xml');return {valid:!doc.querySelector('parsererror'),types:Array.from(doc.querySelectorAll('key')).filter(key=>key.textContent==='PayloadType').map(key=>key.nextElementSibling?.textContent),name:Array.from(doc.querySelectorAll('key')).find(key=>key.textContent==='CalDAVAccountDescription')?.nextElementSibling?.textContent};},profile);
  expect(parsed).toEqual({valid:true,types:['Configuration','com.apple.caldav.account'],name:'Shiftly'});
  await page.route('https://fixture.invalid/**',route=>route.fulfill({status:200,headers:{'Content-Type':'application/x-apple-aspen-config','Content-Disposition':'attachment; filename="Shiftly.mobileconfig"'},body:profile}));
  // WebKit routes Apple's profile MIME type to its native profile handler,
  // which is outside Playwright and does not emit a download event. Check
  // the actual navigation response there; Chromium also checks saved bytes.
  const responseReady=page.waitForResponse(response=>response.url()===new URL('setup/caldav/s0123456789abcdef01234567.mobileconfig','https://fixture.invalid/functions/v1/shiftly-api/').href);
  const downloading=browserName==='chromium'?page.waitForEvent('download'):null;
  await link.click();const response=await responseReady;
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/x-apple-aspen-config');
  expect(response.headers()['content-disposition']).toBe('attachment; filename="Shiftly.mobileconfig"');
  if(downloading){const downloaded=await downloading;expect(downloaded.suggestedFilename()).toBe('Shiftly.mobileconfig');expect(await readFile((await downloaded.path())!,'utf8')).toBe(profile);}
  expect(profile).not.toContain('CalDAVPassword');
 });
 test(theme+' settings and every More tool remain reachable',async({page},info)=>{
  await openSample(page,theme);await more(page);
  await expect(page.getByRole('button',{name:'Manage rosters Add another person or job'})).toBeVisible();
  await inspectSurface(page,info,'more-'+theme);
  await page.getByRole('button',{name:'Settings Appearance and shift types'}).click();
  for(const [name,heading] of [['Appearance Theme and calendar layout','Appearance'],['Shift types Create, edit and restore shifts','Shift types'],['Calendar sync Apple, Google, Outlook & more','Calendar sync'],['Backup & files Import, export and keep a copy','Backup & files']]){
   await page.getByRole('button',{name,exact:true}).click();
   await expect(page.getByRole('heading',{name:heading,exact:true}).first()).toBeVisible();
   await inspectSurface(page,info,'settings-'+heading+'-'+theme);
   await page.getByRole('button',{name:'All settings',exact:true}).click();
  }
  await more(page);await page.getByRole('button',{name:'Insights Hours, days off and estimated pay'}).click();
  await expect(page.getByText('Planned duty hours',{exact:true})).toBeVisible();
  await inspectSurface(page,info,'insights-'+theme);
 });
 test(theme+' search finds private sample notes, clears and explains empty results',async({page},info)=>{
  await openSample(page,theme);await page.getByRole('button',{name:'Calendar menu',exact:true}).click();
  await page.getByRole('button',{name:'Search calendar',exact:true}).click();
  const search=page.getByRole('searchbox');await search.fill('training folder');
  await expect(page.getByText('1 result',{exact:true})).toBeVisible();
  await expect(page.locator('.search-results')).toContainText('Remember your training folder');
  await inspectSurface(page,info,'search-results-'+theme);
  await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(search).toHaveValue('');
  await search.fill('no-match-12345');await expect(page.getByRole('heading',{name:'No matches found'})).toBeVisible();
  await inspectSurface(page,info,'search-empty-'+theme);
 });
 test(theme+' quick entries save beside the planned duty',async({page},info)=>{
  await openSample(page,theme);
  for(const kind of ['overtime','leave','note']){
   await page.getByRole('button',{name:'Add '+kind,exact:true}).click();
   const dialog=page.getByRole('dialog');
   if(kind==='overtime'){await dialog.getByLabel('From',{exact:true}).fill('19:00');await dialog.getByLabel('To',{exact:true}).fill('23:00');}
   await dialog.getByLabel(kind==='note'?'Note':'Note, optional',{exact:true}).fill('Sample '+kind+' entry');
   await inspectSurface(page,info,'quick-'+kind+'-'+theme);
   await dialog.getByRole('button',{name:'Save',exact:true}).click();
   await expect(page.getByRole('dialog')).toHaveCount(0);
   await expect(page.locator('.phone-day-peek')).toContainText('Sample '+kind+' entry');
   await expect(page.locator('[data-roster-date="2026-10-19"]')).toHaveAttribute('aria-label',/Day/);
  }
 });
 test(theme+' account, sharing, app help and QR stay within their sheets',async({page},info)=>{
  await openSample(page,theme);await page.getByRole('button',{name:'Account and sign in',exact:true}).click();
  await inspectSurface(page,info,'account-'+theme);
  await openSample(page,theme);await more(page);await page.getByRole('button',{name:'Sharing Choose who can see or edit your roster'}).click();
  await expect(page.getByRole('dialog')).toContainText('Sign in with Google');await inspectSurface(page,info,'sharing-'+theme);
  await openSample(page,theme);await more(page);await page.getByRole('button',{name:'App & help Install, update or read the guide'}).click();
  await inspectSurface(page,info,'app-help-'+theme);
  await page.getByRole('button',{name:'Share app link & QR code',exact:true}).click();
  await expect(page.getByLabel('Public app installation link')).toHaveValue(/\/Shiftly\/\?install=1$/);
  await expect.poll(()=>page.locator('.app-qr img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await inspectSurface(page,info,'app-qr-'+theme);
 });
 test(theme+' long roster names and three entries do not escape the frame',async({page},info)=>{
  await openSample(page,theme,'stress');
  const duty=page.locator('.phone-peek-duty');
  expect(await duty.evaluate(el=>el.getBoundingClientRect().bottom<=el.closest('.phone-peek-heading')!.getBoundingClientRect().bottom+1)).toBe(true);
  await inspectSurface(page,info,'long-calendar-'+theme);
  await page.getByRole('button',{name:'Open selected date details',exact:true}).click();
  await inspectSurface(page,info,'long-day-'+theme);
  await expect(page.getByRole('dialog')).toContainText('updated handover notes');
  await openSample(page,theme,'stress');await more(page);await page.getByRole('button',{name:'Manage rosters Add another person or job'}).click();
  await page.getByRole('button',{name:'Name, colour & delete',exact:true}).click();
  await inspectSurface(page,info,'long-roster-editor-'+theme);
 });
}

test('empty and read-only calendars keep navigation and safe actions clear',async({page},info)=>{
 await openSample(page,'light','empty');await page.locator('.mobile-nav').getByRole('button',{name:'Today',exact:true}).click();
 await expect(page.getByRole('heading',{name:'No shift planned today'})).toBeVisible();await inspectSurface(page,info,'empty-today');
 await page.locator('.mobile-nav').getByRole('button',{name:'Schedule',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Set up your work schedule'})).toBeVisible();await inspectSurface(page,info,'empty-patterns');
 await openSample(page,'dark','viewer');await expect(page.getByRole('button',{name:'Edit',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Add note',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Open selected date details',exact:true}).click();await inspectSurface(page,info,'read-only-day');
});

test('pattern builder, event editor, shift editor and onboarding work through complete steps',async({page},info)=>{
 await openSample(page);await page.locator('.mobile-nav').getByRole('button',{name:'Schedule',exact:true}).click();
 await page.getByRole('button',{name:'Add repeating schedule',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Start with an example').selectOption('custom');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Add at least one day');
 for(const name of ['Day','Night','Rest','Off'])await page.locator('.shift-palette').first().getByRole('button').filter({hasText:name}).first().click();
 await expect(page.locator('.sequence-day')).toHaveCount(4);await expect(page.getByRole('alert')).toHaveCount(0);await inspectSurface(page,info,'pattern-sequence');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await inspectSurface(page,info,'pattern-dates');await page.getByRole('button',{name:'Show my shifts',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.toast')).toContainText('Your schedule is ready');
 await openSample(page);await page.getByRole('button',{name:'Add overtime',exact:true}).click();await page.getByRole('button',{name:'More options',exact:true}).click();
 await inspectSurface(page,info,'event-editor');await page.locator('summary').filter({hasText:'More options · privacy'}).click();await inspectSurface(page,info,'event-options');
 await openSample(page);await more(page);await page.getByRole('button',{name:'Settings Appearance and shift types'}).click();
 await page.getByRole('button',{name:'Shift types Create, edit and restore shifts'}).click();await page.getByRole('button',{name:/Create (?:a )?shift/}).click();
 await page.getByLabel('Shift name',{exact:true}).fill('Sample recovery shift');await inspectSurface(page,info,'shift-editor');
 await page.getByRole('button',{name:'Save shift',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await openSample(page);await more(page);await page.getByRole('button',{name:'Getting started Learn the basics'}).click();
 for(let step=1;step<=4;step++){await inspectSurface(page,info,'guide-'+step);if(step<4)await page.getByRole('button',{name:'Continue',exact:true}).click();}
 await page.getByRole('button',{name:'Open my calendar',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Agenda, Year and edit tools remain usable from the calendar menu',async({page},info)=>{
 for(const [view,description,selector] of [['Agenda','Duties and entries in a list','.agenda-row'],['Year','All twelve months','.mini-month']]){
  await openSample(page,'dark','stress');await page.getByRole('button',{name:'Calendar menu',exact:true}).click();
  await page.getByRole('button',{name:'Calendar views',exact:true}).click();
  await page.getByRole('button',{name:view+' '+description,exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator(selector).first()).toBeVisible();
  if(view==='Year'){
   const january=page.getByRole('button',{name:'Open January 2026',exact:true});
   await expect(january.locator('.mini-date-grid>span').nth(3)).toHaveAttribute('data-mini-date','2026-01-01');
   await page.getByRole('button',{name:'Next year',exact:true}).click();await expect(page.getByRole('button',{name:'Open January 2027',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Previous year',exact:true}).click();
  }
  await inspectSurface(page,info,'calendar-'+view);
 }
 await openSample(page);await page.getByRole('button',{name:'Edit',exact:true}).click();
 await page.locator('[data-roster-date="2026-10-19"]').click();await page.locator('[data-roster-date="2026-10-20"]').click();
 await expect(page.locator('.phone-edit-bar')).toContainText('2 selected');
 await page.getByRole('button',{name:'More editing tools',exact:true}).click();await inspectSurface(page,info,'edit-tools');
 await expect(page.getByRole('dialog')).toContainText('Copy');
 await openSample(page);await page.getByRole('button',{name:'Calendar menu',exact:true}).click();
 await page.getByRole('button',{name:'Calendar tools & files',exact:true}).click();
 await page.locator('summary').filter({hasText:'Export or print calendar'}).click();await inspectSurface(page,info,'calendar-files');
});

test('creating a separate sample roster supports a Together comparison',async({page},info)=>{
 await openSample(page);await more(page);await page.getByRole('button',{name:'Manage rosters Add another person or job'}).click();
 await page.getByRole('button',{name:'Add a person or job',exact:true}).click();await page.getByLabel('Person or job name',{exact:true}).fill('Sample partner');
 await inspectSurface(page,info,'new-roster');await page.getByRole('button',{name:'Create roster',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Sample partner is ready');
 await page.getByRole('button',{name:'Return to rosters',exact:true}).click();await page.getByRole('button',{name:'Compare rosters',exact:true}).click();
 await inspectSurface(page,info,'compare-picker');await page.getByRole('button',{name:'Show comparison',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('Sample partner',{exact:true}).first()).toBeVisible();
 await inspectSurface(page,info,'together-view');
});
