import assert from 'node:assert/strict';
const root='http://127.0.0.1:'+(process.env.TEST_API_PORT||'8787');const owner={id:'test-owner-'+Date.now(),email:'owner@example.invalid'},viewer={id:'test-viewer-'+Date.now(),email:'viewer@example.invalid'},stranger={id:'stranger',email:'stranger@example.invalid'};
async function req(user,path='',body){const headers=user?{'x-test-user-id':user.id,'x-test-user-email':user.email}:{};if(body)headers['Content-Type']='application/json';const r=await fetch(root+'/api/calendar'+path,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}
async function feedReq(user,body){const headers={...(user?{'x-test-user-id':user.id,'x-test-user-email':user.email}:{}),'Content-Type':'application/json'};const r=await fetch(root+'/api/calendar/feed',{headers,method:'POST',body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
assert.equal((await req(null)).status,401);let {data:s,status}=await req(owner);assert.equal(status,200);const id=s.calendar.id;assert.equal(s.shifts.length,4);assert.equal((await req(stranger,'?id='+id)).status,403);
const op={action:'mutate',calendarId:id,revision:0,operationId:crypto.randomUUID(),summary:'private event title',changes:[{kind:'event',id:'secret',data:{id:'secret',date:'2026-11-20',time:'10:00',title:'SECRET',notes:'PRIVATE',emoji:'🏥',private:true,reminders:[]}}]};assert.equal((await req(owner,'',op)).status,200);assert.equal((await req(owner,'',op)).status,200);assert.equal((await req(owner,'',{...op,operationId:crypto.randomUUID()})).status,409);
const extra=(await req(owner,'',{action:'invite',calendarId:id,email:viewer.email,role:'viewer'})).data.token;let result=await req(owner,'',{action:'invite',calendarId:id,email:viewer.email,role:'viewer'});assert.equal(result.status,200);const token=result.data.token;assert.equal((await req(viewer,'',{action:'accept',token:extra})).status,400);assert.equal((await req(stranger,'',{action:'accept',token})).status,400);assert.equal((await req(viewer,'',{action:'accept',token})).status,200);let shared=await req(viewer,'?id='+id);assert.equal(shared.status,200);assert.equal(shared.data.events.length,0);assert.ok(!JSON.stringify(shared.data).includes('private event title'));assert.equal(shared.data.role,'viewer');assert.equal((await req(viewer,'',{...op,operationId:crypto.randomUUID(),revision:1})).status,403);
const fresh=(await req(owner,'?id='+id)).data;const member=fresh.members[0];assert.equal((await req(owner,'',{action:'revoke',calendarId:id,id:member.id})).status,200);assert.equal((await req(viewer,'?id='+id)).status,403);assert.equal((await req(viewer,'',{action:'accept',token})).status,400);assert.equal((await req(viewer,'',{action:'accept',token:extra})).status,400);
console.log('API PASS: auth, ownership, private-event filtering, private audit filtering, viewer restriction, idempotency, optimistic locking, email-bound invites and revoked sharing.');

const created=await req(owner,'',{action:'newCalendar',name:'Second job'});assert.equal(created.status,200);const second=(await req(owner,'?id='+created.data.id)).data;assert.equal(second.shifts.length,4);
const send=async changes=>{const state=(await req(owner,'?id='+created.data.id)).data;return req(owner,'',{action:'mutate',calendarId:created.data.id,revision:state.calendar.revision,operationId:crypto.randomUUID(),changes});};
const rest={id:'rest',name:'Rest',short:'R',emoji:'🛌',color:'#e7ebf2',textColor:'#667085',start:'',end:'',category:'Off',breakMinutes:0,paidBreak:true,rate:0,location:''};assert.equal((await send([{kind:'shift',id:'rest',data:rest},{kind:'pattern',id:'nurse-cycle',data:{id:'nurse-cycle',name:'12-day nursing roster',items:['day','day','night','rest','off','day','night','rest','off','day','night','rest'],start:'2026-10-18',repeat:100}},{kind:'event',id:'overtime-sample',data:{id:'overtime-sample',date:'2026-10-24',title:'Overtime night',emoji:'⏱️',time:'',notes:'PRIVATE OVERTIME DETAILS',private:true,entryType:'overtime',reminders:[]}}])).status,200);
let feed=await feedReq(owner,{action:'status',calendarId:created.data.id,rosterId:'main'});assert.equal(feed.status,200);assert.equal(feed.data.connected,false);assert.equal(feed.data.includeOff,true);assert.equal((await feedReq(viewer,{action:'create',calendarId:created.data.id,rosterId:'main'})).status,403);feed=await feedReq(owner,{action:'create',calendarId:created.data.id,rosterId:'main'});assert.equal(feed.status,200);const feedUrl=feed.data.url;assert.ok(feed.data.webcal.startsWith('webcal:'));assert.ok(feedUrl.includes('token='));const feedResponse=await fetch(feedUrl);assert.equal(feedResponse.status,200);assert.match(feedResponse.headers.get('content-type'),/text\/calendar/);let feedText=await feedResponse.text();assert.ok(feedText.includes('SUMMARY:Day'));assert.ok(feedText.includes('SUMMARY:Night'));assert.ok(feedText.includes('SUMMARY:Rest\r\nCATEGORIES:Off'));assert.ok(feedText.includes('SUMMARY:Overtime night\r\nCATEGORIES:OVERTIME'));assert.ok(!feedText.includes('PRIVATE OVERTIME DETAILS'));assert.ok(feedText.includes('DTSTART:20261020T170000Z\r\nDTEND:20261021T050000Z'));const stableUid=feedText.match(/UID:[^\r\n]*2026-10-19-shift@shiftly/);assert.ok(stableUid);assert.equal((await send([{kind:'occurrence',id:'2026-10-19',data:{id:'2026-10-19',date:'2026-10-19',shiftId:'off'}}])).status,200);const changedFeed=await (await fetch(feedUrl)).text();assert.ok(changedFeed.includes('SUMMARY:Off\r\nCATEGORIES:Off'));assert.ok(changedFeed.includes(stableUid[0]));const configOff=await feedReq(owner,{action:'configure',calendarId:created.data.id,rosterId:'main',includeOff:false});assert.equal(configOff.status,200);assert.equal(configOff.data.includeOff,false);const filteredFeed=await(await fetch(feedUrl)).text();assert.ok(!filteredFeed.includes('2026-10-21-shift@shiftly'));assert.ok(!filteredFeed.includes('2026-10-22-shift@shiftly'));assert.ok(filteredFeed.includes('SUMMARY:Overtime night'));assert.ok(filteredFeed.includes('SUMMARY:Day'));assert.ok(filteredFeed.includes('SUMMARY:Night'));assert.equal((await feedReq(owner,{action:'status',calendarId:created.data.id,rosterId:'main'})).data.includeOff,false);const configOn=await feedReq(owner,{action:'configure',calendarId:created.data.id,rosterId:'main',includeOff:true});assert.equal(configOn.status,200);assert.ok((await(await fetch(feedUrl)).text()).includes('SUMMARY:Rest\r\nCATEGORIES:Off'));assert.equal((await feedReq(owner,{action:'revoke',calendarId:created.data.id,rosterId:'main'})).status,200);assert.equal((await fetch(feedUrl)).status,404);assert.equal((await feedReq(owner,{action:'status',calendarId:created.data.id,rosterId:'main'})).data.connected,false);const reconnected=await feedReq(owner,{action:'create',calendarId:created.data.id,rosterId:'main'});assert.equal(reconnected.status,200);assert.notEqual(reconnected.data.url,feedUrl);assert.equal((await fetch(feedUrl)).status,404);assert.equal((await fetch(reconnected.data.url)).status,200);assert.equal((await feedReq(owner,{action:'revoke',calendarId:created.data.id,rosterId:'main'})).status,200);assert.equal((await send([{kind:'event',id:'overtime-sample',remove:true},{kind:'pattern',id:'nurse-cycle',remove:true},{kind:'shift',id:'rest',remove:true}])).status,200);console.log('API PASS: private Apple Calendar feed creation, reader authorization, stable shift identifiers, actual roster output, overtime privacy, live updates, disconnect and reconnect.');
assert.equal((await send([{kind:'occurrence',id:'2026-11-01',data:{id:'2026-11-01',date:'2026-11-01',shiftId:'missing'}}])).status,400);
assert.equal((await send([{kind:'settings',data:{rate:-5}}])).status,400);
assert.equal((await send([{kind:'event',id:'day',data:{id:'day',date:'2026-11-01',title:'Collision',emoji:'X',time:'',notes:'',private:false,reminders:[]}}])).status,400);
assert.equal((await send([{kind:'event',id:'public-private-notes',data:{id:'public-private-notes',date:'2026-11-01',title:'Shared appointment',emoji:'🏥',time:'',notes:'OWNER SECRET',private:false,notesPrivate:true,reminders:[]}}])).status,200);
const editor={id:'editor-'+Date.now(),email:'editor@example.invalid'};const editorInvite=(await req(owner,'',{action:'invite',calendarId:created.data.id,email:editor.email,role:'editor'})).data.token;assert.equal((await req(editor,'',{action:'accept',token:editorInvite})).status,200);
const editorData=(await req(editor,'?id='+created.data.id)).data;assert.equal(editorData.events[0].notes,'');
assert.equal((await req(editor,'',{action:'mutate',calendarId:created.data.id,revision:editorData.calendar.revision,operationId:crypto.randomUUID(),changes:[{kind:'event',id:'public-private-notes',data:{...editorData.events[0],title:'Updated title',notes:'OVERWRITE ATTEMPT',notesPrivate:false}}]})).status,200);
assert.equal((await req(owner,'?id='+created.data.id)).data.events[0].notes,'OWNER SECRET');assert.equal((await req(editor,'?id='+created.data.id)).data.events[0].notes,'');
console.log('API PASS: seeded additional calendars, invalid references/settings, record collisions, outstanding invite revocation and private-note edit preservation.');

const sharedId=created.data.id;
const edit=async changes=>{const state=(await req(editor,'?id='+sharedId)).data;return req(editor,'',{action:'mutate',calendarId:sharedId,revision:state.calendar.revision,operationId:crypto.randomUUID(),changes});};
assert.equal((await edit([
 {kind:'pattern',id:'partner-pattern',data:{id:'partner-pattern',name:'Our rotation',items:['day','day','night','night','off','off','off','off'],start:'2026-11-01',repeat:100}},
 {kind:'occurrence',id:'2026-11-20',data:{id:'2026-11-20',date:'2026-11-20',shiftId:'leave'}},
 {kind:'event',id:'partner-entry',data:{id:'partner-entry',date:'2026-11-17',title:'Car service',time:'10:00',emoji:'🚗',notes:'Partner private note',private:false,notesPrivate:true,reminders:[]}}
])).status,200);
const ownerView=(await req(owner,'?id='+sharedId)).data;
assert.equal(ownerView.patterns.find(p=>p.id==='partner-pattern').repeat,100);
assert.equal(ownerView.occurrences.find(o=>o.date==='2026-11-20').shiftId,'leave');
assert.equal(ownerView.events.find(e=>e.id==='partner-entry').notes,'');
assert.equal((await req(editor,'',{action:'memberRole',calendarId:sharedId,id:'none',role:'editor'})).status,403);
const editorMember=ownerView.members.find(m=>m.email===editor.email);
const staleInvite=(await req(owner,'',{action:'invite',calendarId:sharedId,email:editor.email,role:'editor'})).data.token;
assert.equal((await req(owner,'',{action:'memberRole',calendarId:sharedId,id:editorMember.id,role:'viewer'})).status,200);
assert.equal((await edit([{kind:'occurrence',id:'2026-11-21',data:{id:'2026-11-21',date:'2026-11-21',shiftId:'day'}}])).status,403);
assert.equal((await req(editor,'',{action:'accept',token:staleInvite})).status,400);
assert.equal((await req(owner,'',{action:'memberRole',calendarId:sharedId,id:editorMember.id,role:'editor'})).status,200);
const controller=new AbortController();
const live=await fetch(root+'/api/live?id='+sharedId,{headers:{'x-test-user-id':editor.id,'x-test-user-email':editor.email},signal:controller.signal});
assert.equal(live.status,200);const reader=live.body.getReader();const decoder=new TextDecoder();
const first=decoder.decode((await reader.read()).value);const before=JSON.parse(first.match(/data: (.+)/)[1]).revision;
assert.equal((await edit([{kind:'occurrence',id:'2026-11-21',data:{id:'2026-11-21',date:'2026-11-21',shiftId:'day'}}])).status,200);
let observed=false;for(let attempt=0;attempt<4;attempt++){const chunk=decoder.decode((await reader.read()).value);if([...chunk.matchAll(/data: (.+)/g)].some(m=>JSON.parse(m[1]).revision>before)){observed=true;break;}}
controller.abort();assert.equal(observed,true);
console.log('API PASS: partner edits daily shifts/events and patterns, live revision delivery, permission changes, and stale invitation privilege prevention.');

const friend={id:'friend-'+Date.now(),email:'friend@example.invalid'};
const wife={id:'wife-'+Date.now(),email:'wife@example.invalid'};
const friendState=(await req(friend)).data;
assert.notEqual(friendState.calendar.id,id);
assert.equal(friendState.events.length,0);assert.equal(friendState.patterns.length,0);
assert.deepEqual(friendState.calendars.map(c=>c.id),[friendState.calendar.id]);
assert.equal((await req(owner,'?id='+friendState.calendar.id)).status,403);
assert.equal((await req(friend,'?id='+id)).status,403);
const wifeToken=(await req(friend,'',{action:'invite',calendarId:friendState.calendar.id,email:wife.email,role:'editor'})).data.token;
assert.equal((await req(wife,'',{action:'accept',token:wifeToken})).status,200);
const wifeView=(await req(wife,'?id='+friendState.calendar.id)).data;
assert.equal(wifeView.role,'editor');
assert.equal(wifeView.calendars.find(c=>c.id===friendState.calendar.id).role,'editor');
assert.equal((await req(wife,'',{action:'mutate',calendarId:friendState.calendar.id,revision:wifeView.calendar.revision,operationId:crypto.randomUUID(),changes:[{kind:'occurrence',id:'2026-11-10',data:{id:'2026-11-10',date:'2026-11-10',shiftId:'night'}}]})).status,200);
assert.equal((await req(friend)).data.occurrences[0].shiftId,'night');
assert.equal((await req(owner,'?id='+friendState.calendar.id)).status,403);
assert.equal((await req(null,'?id='+friendState.calendar.id)).status,401);
assert.equal((await req(null,'',{action:'accept',token:wifeToken})).status,401);
assert.equal((await req(owner,'',{action:'sessionCheck'})).status,200);assert.equal((await req(owner)).headers.get('cache-control'),'private, no-store');
console.log('API PASS: independent friend and spouse accounts, isolated calendar lists, spouse editing and anonymous denial.');

const familyId=friendState.calendar.id;
async function familyWrite(user,changes){const snapshot=(await req(user,'?id='+familyId)).data;return req(user,'',{action:'mutate',calendarId:familyId,revision:snapshot.calendar.revision,operationId:crypto.randomUUID(),changes});}
assert.equal((await familyWrite(friend,[{kind:'roster',id:'main',data:{id:'main',name:'Friend',color:'#1570ef'}},{kind:'roster',id:'wife',data:{id:'wife',name:'Wife',color:'#398a71'}},{kind:'pattern',id:'wife-pattern',data:{id:'wife-pattern',rosterId:'wife',name:'Her pattern',items:['off','night'],start:'2026-11-01',repeat:100}}])).status,200);
assert.equal((await familyWrite(wife,[{kind:'occurrence',id:'wife:2026-11-10',data:{id:'wife:2026-11-10',rosterId:'wife',date:'2026-11-10',shiftId:'off'}},{kind:'event',id:'wife-event',data:{id:'wife-event',rosterId:'wife',date:'2026-11-10',title:'Wife appointment',time:'10:00',emoji:'🏥',notes:'',private:false,reminders:[]}}])).status,200);
const family=(await req(friend,'?id='+familyId)).data;
assert.equal(family.rosters.length,2);assert.equal(family.rosters[0].name,'Friend');
assert.equal(family.occurrences.find(o=>o.id==='2026-11-10').shiftId,'night');
assert.equal(family.occurrences.find(o=>o.id==='wife:2026-11-10').shiftId,'off');
assert.equal(family.patterns.find(p=>p.id==='wife-pattern').rosterId,'wife');
assert.equal(family.events.find(e=>e.id==='wife-event').rosterId,'wife');
assert.equal((await familyWrite(wife,[{kind:'occurrence',id:'wrong:2026-11-10',data:{id:'wrong:2026-11-10',rosterId:'wrong',date:'2026-11-10',shiftId:'day'}}])).status,400);
assert.equal((await req(owner,'?id='+familyId)).status,403);
assert.equal((await req(owner)).data.calendars.some(c=>c.id===familyId),false);
assert.equal((await familyWrite(friend,[{kind:'roster',id:'wife',remove:true}])).status,400);
const ownerMember=(await req(friend,'?id='+familyId)).data.members.find(m=>m.email===wife.email);
assert.equal((await req(friend,'',{action:'memberRole',calendarId:familyId,id:ownerMember.id,role:'viewer'})).status,200);
assert.equal((await familyWrite(wife,[{kind:'roster',id:'extra',data:{id:'extra',name:'Unauthorized',color:'#1570ef'}}])).status,403);
console.log('API PASS: multiple rosters per calendar, independent same-date shifts and patterns, editor access, viewer denial and original-owner isolation.');

const emojiShift=(await req(owner,'?id='+created.data.id)).data.shifts.find(s=>s.id==='night');
assert.equal((await send([{kind:'shift',id:'night',data:{...emojiShift,emoji:'👨‍👩‍👧‍👦',fontSize:18}}])).status,200);
assert.equal((await send([{kind:'event',id:'native-family',data:{id:'native-family',date:'2026-11-01',title:'Family',emoji:'👩🏽‍⚕️',time:'',notes:'',private:false,reminders:[]}}])).status,200);
const emojiReload=(await req(owner,'?id='+created.data.id)).data;
assert.equal(emojiReload.shifts.find(s=>s.id==='night').emoji,'👨‍👩‍👧‍👦');
assert.equal(emojiReload.shifts.find(s=>s.id==='night').fontSize,18);
assert.equal(emojiReload.events.find(e=>e.id==='native-family').emoji,'👩🏽‍⚕️');
console.log('API PASS: complex native emoji and per-shift label sizes persist through cloud validation and reload.');

const beforeArchive=(await req(owner,'?id='+created.data.id)).data;
const shiftForArchive=beforeArchive.shifts.find(shift=>shift.id==='night');
assert.equal((await send([{kind:'shift',id:shiftForArchive.id,data:{...shiftForArchive,archived:true}}])).status,200);
const afterArchive=(await req(owner,'?id='+created.data.id)).data;
assert.equal(afterArchive.shifts.find(shift=>shift.id==='night').archived,true);
assert.deepEqual(afterArchive.patterns,beforeArchive.patterns);assert.deepEqual(afterArchive.occurrences,beforeArchive.occurrences);assert.deepEqual(afterArchive.events,beforeArchive.events);
assert.equal((await send([{kind:'shift',id:shiftForArchive.id,data:{...shiftForArchive,archived:false}}])).status,200);
assert.equal((await req(owner,'?id='+created.data.id)).data.shifts.find(shift=>shift.id==='night').archived,false);
console.log('API PASS: deleting and restoring shift choices persists without rewriting dates, patterns or private notes.');

// Single-roster access is enforced for payloads, guessed IDs, definitions,
// exports, invitation replacement, permission narrowing and revoked streams.
const scopedUser={id:'scoped-'+Date.now(),email:'scoped@example.invalid'};
const familyRows=(await req(friend,'?id='+familyId)).data;
assert.equal((await familyWrite(friend,[{kind:'event',id:'outside-secret',data:{id:'outside-secret',rosterId:'main',date:'2026-11-11',title:'UNSHARED SECRET',emoji:'📝',time:'',notes:'DO NOT LEAK',private:false,reminders:[]}}])).status,200);
const oldWhole=(await req(friend,'',{action:'invite',calendarId:familyId,email:scopedUser.email,role:'editor'})).data.token;
const scopedToken=(await req(friend,'',{action:'invite',calendarId:familyId,email:scopedUser.email,role:'editor',rosterId:'wife'})).data.token;
assert.equal((await req(scopedUser,'',{action:'accept',token:oldWhole})).status,400);
assert.equal((await req(stranger,'',{action:'invitationInfo',token:scopedToken})).status,400);
const info=await req(scopedUser,'',{action:'invitationInfo',token:scopedToken});assert.equal(info.status,200);assert.equal(info.data.rosterName,'Wife');assert.equal(info.data.wholeCalendar,false);
assert.equal((await req(scopedUser,'',{action:'accept',token:scopedToken})).status,200);
let scoped=(await req(scopedUser,'?id='+familyId)).data;
assert.equal(scoped.rosterScope,'wife');assert.deepEqual(scoped.rosters.map(r=>r.id),['wife']);assert.equal(scoped.shifts.some(s=>s.id==='day'),true);assert.ok(!JSON.stringify(scoped).includes('UNSHARED SECRET'));assert.ok(!JSON.stringify(scoped).includes('DO NOT LEAK'));assert.equal(scoped.occurrences.some(o=>(o.rosterId||'main')==='main'),false);
async function scopedWrite(changes){const state=(await req(scopedUser,'?id='+familyId)).data;return req(scopedUser,'',{action:'mutate',calendarId:familyId,revision:state.calendar.revision,operationId:crypto.randomUUID(),changes});}
assert.equal((await scopedWrite([{kind:'event',id:'outside-secret',remove:true}])).status,403);
assert.equal((await scopedWrite([{kind:'event',id:'outside-secret',data:{id:'outside-secret',rosterId:'wife',date:'2026-11-11',title:'Moved',emoji:'X',time:'',notes:'',private:false,reminders:[]}}])).status,403);
assert.equal((await scopedWrite([{kind:'occurrence',id:'2026-11-11',data:{id:'2026-11-11',date:'2026-11-11',shiftId:'night'}}])).status,403);
assert.equal((await scopedWrite([{kind:'settings',data:{density:'compact'}}])).status,403);
assert.equal((await scopedWrite([{kind:'roster',id:'wife',data:{id:'wife',name:'Changed',color:'#123456'}}])).status,403);
assert.equal((await scopedWrite([{kind:'shift',id:'night',data:{...scoped.shifts.find(s=>s.id==='night'),rosterId:'wife',color:'#123456'}}])).status,400);
assert.equal((await scopedWrite([{kind:'occurrence',id:'wife:2026-11-12',data:{id:'wife:2026-11-12',rosterId:'wife',date:'2026-11-12',shiftId:'night'}},{kind:'event',id:'scoped-entry',data:{id:'scoped-entry',rosterId:'wife',date:'2026-11-12',title:'New appointment',emoji:'🏥',time:'10:00',notes:'SCOPED PRIVATE NOTE',private:false,notesPrivate:true,reminders:[],cellLabel:'Clinic'}}])).status,200);
const localType={...scoped.shifts.find(s=>s.id==='night'),id:'wife-custom',rosterId:'wife',name:'Her custom night'};
assert.equal((await scopedWrite([{kind:'shift',id:localType.id,data:localType},{kind:'pattern',id:'scoped-pattern',data:{id:'scoped-pattern',rosterId:'wife',name:'Her custom cycle',items:[localType.id,'off'],start:'2027-01-01',repeat:100}}])).status,200);
assert.equal((await familyWrite(friend,[{kind:'occurrence',id:'2026-11-22',data:{id:'2026-11-22',date:'2026-11-22',shiftId:localType.id}}])).status,400);
assert.equal((await req(friend,'?id='+familyId)).data.events.find(e=>e.id==='scoped-entry').notes,'');
const scopeMember=(await req(friend,'?id='+familyId)).data.members.find(m=>m.email===scopedUser.email);
assert.equal(scopeMember.roster_id,'wife');assert.equal((await req(friend,'',{action:'memberRole',calendarId:familyId,id:scopeMember.id,role:'editor'})).status,200);assert.equal((await req(scopedUser,'?id='+familyId)).data.rosterScope,'wife');
assert.equal((await req(friend,'',{action:'memberRole',calendarId:familyId,id:scopeMember.id,role:'viewer',rosterId:'wife'})).status,200);
assert.equal((await scopedWrite([{kind:'occurrence',id:'wife:2026-11-13',data:{id:'wife:2026-11-13',rosterId:'wife',date:'2026-11-13',shiftId:'off'}}])).status,403);
assert.equal((await req(friend,'',{action:'revoke',calendarId:familyId,id:scopeMember.id})).status,200);
assert.equal((await req(scopedUser,'?id='+familyId)).status,403);
assert.equal((await req(scopedUser,'',{action:'accept',token:scopedToken})).status,400);
const revokedLive=await fetch(root+'/api/live?id='+familyId,{headers:{'x-test-user-id':scopedUser.id,'x-test-user-email':scopedUser.email}});assert.equal(revokedLive.status,403);
console.log('API PASS: single-roster payload isolation, invitation scope preview, superseded links, foreign-ID denial, safe custom types, private notes, viewer downgrade and revoked live access.');

const implicit=await req(friend,'',{action:'newCalendar',name:'Implicit main scope test'});const implicitId=implicit.data.id;
async function implicitWrite(user,changes){const state=(await req(user,'?id='+implicitId)).data;return req(user,'',{action:'mutate',calendarId:implicitId,revision:state.calendar.revision,operationId:crypto.randomUUID(),changes});}
assert.equal((await implicitWrite(friend,[{kind:'occurrence',id:'2026-11-01',data:{id:'2026-11-01',date:'2026-11-01',shiftId:'day'}},{kind:'roster',id:'wife',data:{id:'wife',name:'Wife',color:'#123456'}},{kind:'pattern',id:'implicit-wife',data:{id:'implicit-wife',rosterId:'wife',name:'Her cycle',items:['night','off'],start:'2026-11-01',repeat:100}}])).status,200);
const implicitToken=(await req(friend,'',{action:'invite',calendarId:implicitId,email:scopedUser.email,role:'editor',rosterId:'wife'})).data.token;
assert.equal((await req(scopedUser,'',{action:'accept',token:implicitToken})).status,200);
assert.equal((await implicitWrite(scopedUser,[{kind:'occurrence',id:'wife:2026-11-02',data:{id:'wife:2026-11-02',rosterId:'wife',date:'2026-11-02',shiftId:'night'}}])).status,200);
console.log('API PASS: scoped editing validates full calendars with an implicit primary roster and permission-only changes preserve existing scope.');
assert.equal((await implicitWrite(friend,[{kind:'roster',id:'wife',data:{id:'wife',name:'Wife',color:'#123456',archived:true}}])).status,200);
assert.equal((await req(scopedUser,'?id='+implicitId)).status,403);
assert.equal((await implicitWrite(friend,[{kind:'roster',id:'wife',data:{id:'wife',name:'Wife',color:'#123456',archived:false}}])).status,200);
assert.equal((await req(scopedUser,'?id='+implicitId)).status,200);
console.log('API PASS: deleted rosters suspend scoped access and restoration preserves the original membership and schedule.');

// Security regression cases added after the privacy review.
const protectedState=(await req(owner,'?id='+created.data.id)).data;
assert.equal((await req(editor,'',{action:'mutate',calendarId:created.data.id,revision:protectedState.calendar.revision,operationId:crypto.randomUUID(),changes:[{kind:'event',id:'public-private-notes',remove:true}]})).status,400);
assert.equal((await req(owner,'?id='+created.data.id)).data.events.find(e=>e.id==='public-private-notes').notes,'OWNER SECRET');
for(const path of ['/', '/api/calendar', '/api/calendar?id=missing', '/auth/callback?code=forged']){const r=await fetch(root+path);assert.equal(r.headers.get('cache-control'),'private, no-store',path);assert.equal(r.headers.get('referrer-policy'),'no-referrer',path);assert.equal(r.headers.get('x-content-type-options'),'nosniff',path);}
const malformed=await fetch(root+'/api/calendar',{method:'POST',headers:{'x-test-user-id':owner.id,'x-test-user-email':owner.email,'Content-Type':'application/json'},body:'null'});assert.equal(malformed.status,400);assert.equal((await malformed.json()).error,'Invalid request');
const oversize=await fetch(root+'/api/calendar',{method:'POST',headers:{'x-test-user-id':owner.id,'x-test-user-email':owner.email,'Content-Type':'application/json'},body:JSON.stringify({value:'x'.repeat(200001)})});assert.equal(oversize.status,400);assert.equal((await oversize.json()).error,'Request too large');
console.log('SECURITY HTTP PASS: private-note deletion protected, sensitive responses never cached, referrer suppression and bounded malformed requests.');
