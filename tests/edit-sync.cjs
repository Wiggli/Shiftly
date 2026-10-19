const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {fastEntryDraft}=require('../lib/quick-entries.ts');
const {shiftAssignmentChanges}=require('../lib/shift-assignment.ts');
const {resolveShift}=require('../lib/engine.ts');
const {copyBlock,pasteBlock,copyPatternAt}=require('../lib/roster-edit.ts');
const root='http://127.0.0.1:'+(process.env.TEST_API_PORT||'8789'),owner='edit-sync-'+Date.now(),headers={'x-test-user-id':owner,'x-test-user-email':'edit-sync@example.invalid','Content-Type':'application/json'};
async function api(path='',body){const response=await fetch(root+'/api/calendar'+path,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});const text=await response.text();assert.equal(response.status,200,text);return JSON.parse(text);}
(async()=>{
 const created=await api('',{action:'newCalendar',name:'Edit sync check'}),id=created.id;
 async function mutate(changes){const s=await api('?id='+id);return api('',{action:'mutate',calendarId:id,revision:s.calendar.revision,operationId:crypto.randomUUID(),changes});}
 const p={id:'edit-pattern',name:'DNRO',items:['day','night','off','off'],start:'2026-11-01',repeat:3},note={id:'kept-note',date:'2026-12-01',title:'Annual leave',emoji:'🌿',time:'',notes:'Private note kept',notesPrivate:true,private:true,entryType:'leave',reminders:[]};
 await mutate([{kind:'pattern',id:p.id,data:p},{kind:'event',id:note.id,data:note}]);
 const before=await api('?id='+id),block=copyBlock(before,['2026-11-01','2026-11-02','2026-11-03','2026-11-04']);
 await mutate(pasteBlock(before,block,'2026-12-01'));
 const copied=copyPatternAt(p,'2027-01-01','placed-pattern');await mutate([{kind:'pattern',id:copied.id,data:copied}]);
 const state=await api('?id='+id);assert.deepEqual(state.events,before.events);assert.deepEqual(state.patterns.find(x=>x.id===p.id),before.patterns.find(x=>x.id===p.id));
 const account=await api('/caldav',{action:'create',calendarId:id,rosterId:'main'});assert.equal(account.groupByType,false);
 const auth={Authorization:'Basic '+Buffer.from(`${account.username}:${account.password}`).toString('base64')};
 const report=await fetch(account.url+'calendar/',{method:'REPORT',headers:auth,body:'<c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav"/>'});assert.equal(report.status,207);const xml=await report.text();
 assert.ok(xml.includes('2026-12-01-shift@shiftly'));assert.ok(xml.includes('2026-12-02-shift@shiftly'));assert.ok(xml.includes('2027-01-01-shift@shiftly'));assert.ok(!xml.includes('Private note kept'));
 for(const [date,title] of [['2026-11-01','Day'],['2026-11-02','Night'],['2026-12-01','Day'],['2026-12-02','Night'],['2027-01-01','Day'],['2027-01-02','Night']]){const r=await fetch(account.url+'calendar/'+encodeURIComponent(`${id}-${date}-shift@shiftly`)+'.ics',{headers:auth});assert.equal(r.status,200);assert.ok((await r.text()).includes('SUMMARY:'+title+'\r\n'));}
 assert.ok(xml.includes('SUMMARY:Annual leave'));assert.equal((xml.match(/BEGIN:VEVENT/g)||[]).length,15);
 const fastDate='2026-11-01',entries=['overtime','leave','note'].map(kind=>({...fastEntryDraft(kind,fastDate,'fast-'+kind),notes:'Keep '+kind}));
 await mutate(entries.map(data=>({kind:'event',id:data.id,data})));
 const annotated=await api('?id='+id);assert.equal(resolveShift(annotated,fastDate).id,'day');for(const entry of entries)assert.ok(annotated.events.some(event=>event.id===entry.id&&event.notes===entry.notes));
 await mutate(shiftAssignmentChanges(annotated,'night',[fastDate]));
 const changed=await api('?id='+id);assert.equal(resolveShift(changed,fastDate).id,'night');assert.deepEqual(changed.events,annotated.events);
 console.log('Fast entries PASS: overtime, leave and note preserve the planned duty; changing duty preserves all three entries.');
 console.log('Edit sync PASS: new pattern, copied duties, saved-pattern placement, source history and private notes preserved, one calendar with correct dated duties.');
})().catch(error=>{console.error(error);process.exitCode=1;});
