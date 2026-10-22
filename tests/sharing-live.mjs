import assert from 'node:assert/strict';
const root='http://127.0.0.1:'+(process.env.TEST_API_PORT||8789);
const stamp=crypto.randomUUID();
const user=name=>({id:name.toLowerCase()+'-'+stamp,email:name.toLowerCase()+'-'+stamp+'@example.invalid',name});
const andre=user('Andre'),maria=user('Maria'),john=user('John');
async function request(user,body,path='/api/calendar'){
 const response=await fetch(root+path,{headers:{'x-test-user-id':user.id,'x-test-user-email':user.email,'x-test-user-name':user.name,...(body?{'Content-Type':'application/json'}:{})},method:body?'POST':'GET',body:body&&JSON.stringify(body)});
 return {status:response.status,data:await response.json()};
}
const own=await request(andre),id=own.data.calendar.id;
assert.equal(own.data.calendar.owner_name,'Andre');
const send=(u,body)=>request(u,{calendarId:id,...body});
const snap=u=>request(u,undefined,'/api/calendar?id='+id);
async function edit(u,changes,revision){const state=await snap(u);return send(u,{action:'mutate',revision:revision??state.data.calendar.revision,operationId:crypto.randomUUID(),changes});}
async function share(u,role){const invite=await send(andre,{action:'invite',email:u.email,role,rosterId:'main'});const info=await request(u,{action:'invitationInfo',token:invite.data.token});assert.equal(info.data.ownerName,'Andre');const receipt=await request(u,{action:'accept',token:invite.data.token});assert.equal(receipt.data.id,id);assert.equal(receipt.data.rosterId,'main');}
await share(maria,'viewer');await share(john,'editor');
const catalog=await request(maria,undefined,'/api/calendar?catalog=1');
assert.equal(catalog.data.calendars.filter(c=>c.role==='owner').length,1);
assert.equal(catalog.data.calendars.find(c=>c.id===id).owner_name,'Andre');
assert.equal(catalog.data.calendars.find(c=>c.id===id).role,'viewer');
assert.ok(!JSON.stringify(catalog.data).includes(john.email));
const controller=new AbortController();
const response=await fetch(root+'/api/live?id='+id,{headers:{'x-test-user-id':maria.id,'x-test-user-email':maria.email},signal:controller.signal});
const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();let buffer='';
async function next(predicate){const deadline=Date.now()+12000;while(Date.now()<deadline){const {done,value}=await reader.read();assert.equal(done,false);buffer+=value;let end;while((end=buffer.indexOf('\n\n'))>=0){const message=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=JSON.parse(message.slice(6));if(predicate(data))return data;}}throw Error('Live state did not arrive');}
assert.equal((await next(d=>!!d.role)).role,'viewer');
const duty={kind:'occurrence',id:'2026-11-03',data:{id:'2026-11-03',date:'2026-11-03',shiftId:'day'}};
assert.equal((await edit(maria,[duty])).status,403);
assert.equal((await edit(andre,[duty])).status,200);
assert.equal((await snap(maria)).data.occurrences[0].shiftId,'day');
const members=(await snap(andre)).data.members,mariaMember=members.find(m=>m.email===maria.email);
assert.equal((await send(andre,{action:'memberRole',id:mariaMember.id,role:'editor'})).status,200);
assert.equal((await next(d=>d.role==='editor')).role,'editor');
assert.equal((await edit(maria,[{...duty,data:{...duty.data,shiftId:'night'}}])).status,200);
assert.equal((await snap(andre)).data.occurrences[0].shiftId,'night');
assert.equal((await snap(john)).data.occurrences[0].shiftId,'night');
for(const action of ['invite','revoke','memberRole','rename','timezone'])assert.equal((await send(maria,{action,id:mariaMember.id,role:'editor',email:john.email,name:'Changed',timezone:'UTC'})).status,403);
assert.equal((await edit(maria,[{kind:'roster',id:'main',data:{id:'main',name:'Destroy',color:'#123456',archived:true}}])).status,403);
// Full legacy grants do not confer ownership either.
await share(john,'editor');
const fullInvite=await send(andre,{action:'invite',email:john.email,role:'editor',rosterId:null});await request(john,{action:'accept',token:fullInvite.data.token});
assert.equal((await edit(john,[{kind:'roster',id:'main',data:{id:'main',name:'Destroy',color:'#123456',archived:true}}])).status,403);
const stale=(await snap(maria)).data.calendar.revision;
assert.equal((await edit(andre,[{...duty,data:{...duty.data,shiftId:'off'}}],stale)).status,200);
assert.equal((await edit(maria,[duty],stale)).status,409);
assert.equal((await snap(maria)).data.occurrences.length,1);
const pattern={id:'rotation',name:'Normal shifts',items:['day','day','night','night','off','off'],start:'2026-11-01',repeat:0};
assert.equal((await edit(andre,[{kind:'pattern',id:pattern.id,data:pattern}])).status,200);
assert.deepEqual((await snap(john)).data.patterns[0].items,pattern.items);
assert.equal((await edit(john,[{kind:'occurrence',id:duty.id,remove:true}])).status,200);
assert.equal((await snap(maria)).data.occurrences.length,0);
assert.equal((await send(andre,{action:'memberRole',id:mariaMember.id,role:'viewer'})).status,200);
await next(d=>d.role==='viewer');assert.equal((await edit(maria,[duty])).status,403);
await send(andre,{action:'revoke',id:mariaMember.id});assert.equal((await next(d=>d.revoked)).revoked,true);controller.abort();
assert.equal((await snap(maria)).status,403);
assert.ok(!(await request(maria,undefined,'/api/calendar?catalog=1')).data.calendars.some(c=>c.id===id));
assert.equal((await snap(john)).status,200);
console.log('SHARING PASS: three separate users, live upgrade/downgrade/revocation, owner identity, isolated catalog, original shared records, pattern propagation, deletion, revision conflicts and owner-only management.');
