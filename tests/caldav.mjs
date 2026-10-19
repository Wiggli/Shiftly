import {calendarDisplayOptions} from '../lib/calendar-appearance.ts';
import assert from 'node:assert/strict';

assert.equal(calendarDisplayOptions(null).groupByType,false);assert.equal(calendarDisplayOptions({groupByType:true}).groupByType,false);assert.equal(calendarDisplayOptions({layoutVersion:2,groupByType:true}).groupByType,true);
const root='http://127.0.0.1:'+(process.env.TEST_API_PORT||'8788');
const owner={id:'caldav-owner-'+Date.now(),email:'caldav-owner@example.invalid'};
async function app(path='',body){const headers={'x-test-user-id':owner.id,'x-test-user-email':owner.email};if(body)headers['Content-Type']='application/json';const r=await fetch(root+'/api/calendar'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
async function mutate(calendarId,changes){const state=(await app('?id='+calendarId)).data;return app('',{action:'mutate',calendarId,revision:state.calendar.revision,operationId:crypto.randomUUID(),changes});}

const created=await app('',{action:'newCalendar',name:'CalDAV test'});assert.equal(created.status,200);const calendarId=created.data.id;
const cycle=['day','day','night','rest','off','day','night','rest','off','day','night','rest'];
const rest={id:'rest',name:'Rest',short:'R',emoji:'🛌',color:'#e7ebf2',textColor:'#667085',start:'',end:'',category:'Off',breakMinutes:0,paidBreak:true,rate:0,location:''};
assert.equal((await mutate(calendarId,[{kind:'shift',id:'rest',data:rest},{kind:'pattern',id:'nurse-12-day-cycle',data:{id:'nurse-12-day-cycle',name:'Nurse 12-day cycle',items:cycle,start:'2026-10-18',repeat:100}}])).status,200);
const setup=await app('/caldav',{action:'create',calendarId,rosterId:'main'});assert.equal(setup.status,200);const account=setup.data,auth={Authorization:'Basic '+Buffer.from(`${account.username}:${account.password}`).toString('base64')};
assert.equal(setup.data.groupByType,false);assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:false,compactTitles:true,groupByType:false})).status,200);
const resumed=await app('/caldav',{action:'status',calendarId,rosterId:'main'});assert.equal(resumed.data.username,account.username);assert.equal(resumed.data.url,account.url);assert.equal(resumed.data.password,undefined);assert.equal(resumed.data.passwordHash,undefined);
const createRetry=await app('/caldav',{action:'create',calendarId,rosterId:'main'});assert.equal(createRetry.status,200);assert.equal(createRetry.data.username,account.username);assert.equal(createRetry.data.url,account.url);assert.equal(createRetry.data.password,undefined);
assert.equal((await fetch(account.url,{method:'OPTIONS',headers:auth})).status,200);
const discovery=await fetch(account.url,{method:'PROPFIND',headers:{...auth,Depth:'1'}});assert.equal(discovery.status,207);assert.match(await discovery.text(),/calendar-home-set/);
const discoveryBody='<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:prop><D:current-user-principal/><C:calendar-home-set/><D:resourcetype/></D:prop></D:propfind>';
const wellKnown=await fetch(root+'/.well-known/caldav',{method:'PROPFIND',headers:auth,body:discoveryBody,redirect:'manual'});assert.equal(wellKnown.status,307);assert.equal(wellKnown.headers.get('location'),'/api/caldav/');
for(const path of ['/api/caldav/','/principals/','/calendar/dav/'+account.username+'/user/','/']){const response=await fetch(root+path,{method:'PROPFIND',headers:{...auth,Depth:'0','Content-Type':'text/xml'},body:discoveryBody});const text=await response.text();assert.equal(response.status,207,path+': '+text);assert.match(text,/calendar-home-set/);}
const principal=await fetch(account.url+'principal/',{method:'PROPFIND',headers:auth,body:discoveryBody});const principalXML=await principal.text();assert.equal(principal.status,207,principalXML);assert.match(principalXML,/<D:principal\/>/);assert.ok(principalXML.includes(`<C:calendar-home-set><D:href>/api/caldav/${account.username}/</D:href>`));
const anonymousPrincipal=await fetch(root+'/principals/',{method:'PROPFIND'});assert.equal(anonymousPrincipal.status,401,await anonymousPrincipal.text());
const patchBody='<D:propertyupdate xmlns:D="DAV:" xmlns:I="http://apple.com/ns/ical/"><D:set><D:prop><I:calendar-color>#FF3B30FF</I:calendar-color><I:calendar-order>1</I:calendar-order><D:displayname>My roster &amp; Shiftly</D:displayname></D:prop></D:set></D:propertyupdate>';
const props=await fetch(account.url+'calendar/',{method:'PROPPATCH',headers:{...auth,'Content-Type':'text/xml'},body:patchBody});assert.equal(props.status,207);assert.match(await props.text(),/200 OK/);
const calendarProps=await fetch(account.url+'calendar/',{method:'PROPFIND',headers:{...auth,Depth:'0'}});const propsXML=await calendarProps.text();assert.match(propsXML,/#FF3B30FF/);assert.match(propsXML,/My roster &amp; Shiftly/);assert.match(propsXML,/<D:sync-token>urn:shiftly:sync:/);
const token=/<D:sync-token>([^<]+)<\/D:sync-token>/.exec(propsXML)[1];assert.match(token,/^urn:shiftly:sync:v5:/);assert.match(propsXML,/<CS:getctag>v5-calendar-\d+<\/CS:getctag>/);const unchangedSync=await fetch(account.url+'calendar/',{method:'REPORT',headers:{...auth,'Content-Type':'text/xml'},body:`<D:sync-collection xmlns:D="DAV:"><D:sync-token>${token}</D:sync-token></D:sync-collection>`});assert.equal(unchangedSync.status,207);assert.ok(!(await unchangedSync.text()).includes('<D:response>'));
const initialSync=await fetch(account.url+'calendar/',{method:'REPORT',headers:{...auth,'Content-Type':'text/xml'},body:'<D:sync-collection xmlns:D="DAV:"><D:sync-token/></D:sync-collection>'});assert.equal(initialSync.status,207);assert.match(await initialSync.text(),/2026-10-18-shift@shiftly/);
// Apple first requests an ETag inventory, then fetches the calendar data separately.
const inventory=await fetch(account.url+'calendar/',{method:'REPORT',headers:auth,body:'<d:sync-collection xmlns:d="DAV:"><d:sync-token/><d:sync-level>1</d:sync-level><d:prop><d:getetag/><d:getcontenttype/><d:resourcetype/><x:unknown xmlns:x="urn:test"/></d:prop></d:sync-collection>'});
const inventoryXML=await inventory.text();assert.equal(inventory.status,207);assert.match(inventoryXML,/getetag/);assert.match(inventoryXML,/text\/calendar/);assert.match(inventoryXML,/404 Not Found/);assert.ok(!inventoryXML.includes('<C:calendar-data>'));
const oldToken=token.replace('urn:shiftly:sync:v5:','urn:shiftly:sync:');const repair=await fetch(account.url+'calendar/',{method:'REPORT',headers:auth,body:`<D:sync-collection xmlns:D="DAV:"><D:sync-token>${oldToken}</D:sync-token></D:sync-collection>`});assert.equal(repair.status,403);assert.match(await repair.text(),/valid-sync-token/);
const requestedProps=await fetch(account.url+'principal/',{method:'PROPFIND',headers:auth,body:'<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/><x:calendar-home-set xmlns:x="urn:wrong"/></d:prop></d:propfind>'});const requestedXML=await requestedProps.text();assert.match(requestedXML,/404 Not Found/);assert.ok(!requestedXML.includes('<D:displayname>'));assert.ok(!requestedXML.includes('<C:calendar-home-set>'));
const depthOne=await fetch(account.url+'calendar/',{method:'PROPFIND',headers:{...auth,Depth:'1'}});assert.equal(depthOne.status,207);assert.match(await depthOne.text(),/getetag/);
const invalidToken=await fetch(account.url+'calendar/',{method:'REPORT',headers:auth,body:'<D:sync-collection xmlns:D="DAV:"><D:sync-token>urn:other:calendar</D:sync-token></D:sync-collection>'});assert.equal(invalidToken.status,403);
const collection=account.url+'calendar/';const report=await fetch(collection,{method:'REPORT',headers:{...auth,'Content-Type':'application/xml'},body:'<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav"><C:comp-filter name="VCALENDAR"><C:comp-filter name="VEVENT"/></C:comp-filter></C:calendar-query>'});assert.equal(report.status,207);assert.match(await report.text(),/2026-10-18-shift@shiftly/);
const uid=`${calendarId}-2026-10-18-shift@shiftly`,eventUrl=collection+encodeURIComponent(uid)+'.ics',existing=await fetch(eventUrl,{headers:auth});assert.equal(existing.status,200);const ics=await existing.text();assert.match(ics,/DTSTART:20261018T050000Z/);
const invalidDate=await fetch(eventUrl,{method:'PUT',headers:{...auth,'Content-Type':'text/calendar'},body:ics.replace('DTSTART:20261018T050000Z','DTSTART:20260230T050000Z')});assert.equal(invalidDate.status,400);assert.equal((await fetch(eventUrl,{headers:auth})).headers.get('etag'),existing.headers.get('etag'));
const changed=ics.replace('DTSTART:20261018T050000Z','DTSTART:20261018T060000Z').replace('DTEND:20261018T170000Z','DTEND:20261018T180000Z');assert.equal((await fetch(eventUrl,{method:'PUT',headers:{...auth,'Content-Type':'text/calendar','If-Match':existing.headers.get('etag')},body:changed})).status,204);
let snapshot=(await app('?id='+calendarId)).data;assert.equal(snapshot.occurrences.find(x=>x.date==='2026-10-18').shiftId.startsWith('caldav_'),true);assert.deepEqual(snapshot.patterns.find(x=>x.id==='nurse-12-day-cycle').items,cycle);assert.equal((await fetch(collection,{method:'REPORT',headers:{...auth,'Content-Type':'application/xml'},body:'<D:sync-collection xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:sync-token>rev-1</D:sync-token></D:sync-collection>'})).status,207);
const newUID='apple-overtime-2026-10-30@example.invalid',newUrl=collection+encodeURIComponent(newUID)+'.ics',newEvent='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:'+newUID+'\r\nDTSTART:20261030T180000Z\r\nDTEND:20261031T060000Z\r\nSUMMARY:Overtime from iPhone\r\nCATEGORIES:OVERTIME\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
const newPut=await fetch(newUrl,{method:'PUT',headers:{...auth,'Content-Type':'text/calendar','If-None-Match':'*'},body:newEvent});assert.equal(newPut.status,201);const savedResource=await fetch(newUrl,{headers:auth});assert.equal(savedResource.headers.get('etag'),newPut.headers.get('etag'));assert.equal((await fetch(newUrl,{method:'DELETE',headers:{...auth,'If-Match':'\"old-version\"'}})).status,412);snapshot=(await app('?id='+calendarId)).data;const saved=snapshot.events.find(x=>x.title==='Overtime from iPhone');assert.equal(saved.entryType,'overtime');assert.equal(saved.time,'19:00');assert.equal(saved.endTime,'07:00');
assert.equal((await fetch(newUrl,{method:'DELETE',headers:auth})).status,204);assert.equal((await app('?id='+calendarId)).data.events.some(x=>x.title==='Overtime from iPhone'),false);
const shiftlyEvent={id:'shiftly-created-overtime',date:'2026-11-02',rosterId:'main',title:'Shiftly overtime',emoji:'⏱️',time:'19:00',endTime:'07:00',notes:'',private:true,entryType:'overtime',location:'',reminders:[]};assert.equal((await mutate(calendarId,[{kind:'event',id:shiftlyEvent.id,data:shiftlyEvent}])).status,200);const beforeDelete=(await app('?id='+calendarId)).data,shiftlyUID=`${calendarId}-${shiftlyEvent.id}-${shiftlyEvent.date}@shiftly`;assert.equal((await fetch(collection+encodeURIComponent(shiftlyUID)+'.ics',{headers:auth})).status,200);assert.equal((await mutate(calendarId,[{kind:'event',id:shiftlyEvent.id,remove:true}])).status,200);const removalSync=await fetch(collection,{method:'REPORT',headers:{...auth,'Content-Type':'application/xml'},body:`<D:sync-collection xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:sync-token>rev-${beforeDelete.calendar.revision}</D:sync-token></D:sync-collection>`});assert.equal(removalSync.status,207);const removalBody=await removalSync.text();assert.ok(removalBody.includes(encodeURIComponent(shiftlyUID)), 'sync report should contain a deletion response for the removed Shiftly event');assert.match(removalBody,/404 Not Found/);
assert.equal((await fetch(account.url,{method:'OPTIONS',headers:{Authorization:'Basic '+Buffer.from(`${account.username}:incorrect`).toString('base64')}})).status,401);
// Double submissions create one login, with only the winning response revealing its password.
assert.equal((await mutate(calendarId,[{kind:'roster',id:'connection-race',data:{id:'connection-race',name:'Connection race',color:'#334455'}}])).status,200);
const raceAccounts=await Promise.all([1,2].map(()=>app('/caldav',{action:'create',calendarId,rosterId:'connection-race'})));for(const account of raceAccounts)assert.equal(account.status,200);assert.equal(raceAccounts[0].data.username,raceAccounts[1].data.username);assert.equal(raceAccounts.filter(account=>account.data.password).length,1);assert.equal((await app('/caldav',{action:'revoke',calendarId,rosterId:'connection-race'})).status,200);
// Named imported rosters use folded UIDs longer than the default calendar fixture.
const rosterId='imported-nurse-roster-2026';const longEvent={id:'imported-note-with-a-long-identifier-2026-10-19',rosterId,date:'2026-10-19',title:'Roster overtime',emoji:'⏱️',time:'19:00',endTime:'07:00',notes:'',private:true,entryType:'overtime',location:'',reminders:[]};
assert.equal((await mutate(calendarId,[{kind:'roster',id:rosterId,data:{id:rosterId,name:'Imported nurse roster',color:'#333399'}},{kind:'occurrence',id:rosterId+':2026-10-19',data:{id:rosterId+':2026-10-19',rosterId,date:'2026-10-19',shiftId:'night'}},{kind:'event',id:longEvent.id,data:longEvent}])).status,200);
const named=await app('/caldav',{action:'create',calendarId,rosterId});const namedAuth={Authorization:'Basic '+Buffer.from(`${named.data.username}:${named.data.password}`).toString('base64')};
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId,includeOff:false,compactTitles:true,groupByType:false})).status,200);
const namedSync=await fetch(named.data.url+'calendar/',{method:'REPORT',headers:namedAuth,body:'<d:sync-collection xmlns:d="DAV:"><d:sync-token/><d:sync-level>1</d:sync-level><d:prop><d:getetag/></d:prop></d:sync-collection>'});const namedInventory=await namedSync.text();assert.equal(namedSync.status,207);const namedHrefs=[...namedInventory.matchAll(/<D:href>([^<]+)<\/D:href>/g)].map(m=>m[1]);assert.equal(namedHrefs.length,2);assert.ok(!namedInventory.includes('<C:calendar-data>'));
const namedMulti=await fetch(named.data.url+'calendar/',{method:'REPORT',headers:namedAuth,body:`<c:calendar-multiget xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:"><d:prop><d:getetag/><c:calendar-data/></d:prop>${namedHrefs.map(h=>`<d:href>${h}</d:href>`).join('')}</c:calendar-multiget>`});const namedXML=await namedMulti.text();assert.equal(namedMulti.status,207);assert.match(namedXML,/Roster overtime/);assert.match(namedXML,/SUMMARY:Night/);assert.ok(!namedXML.includes('SUMMARY:Day'));
// A resource may disappear after Apple's inventory request. Every requested
// href needs an explicit result, and another account's path must not resolve.
const missingHref=`/api/caldav/${named.data.username}/calendar/deleted%26note.ics`;
const foreignHref=namedHrefs[0].replace(named.data.username,account.username);
const mixedReport=await fetch(named.data.url+'calendar/',{method:'REPORT',headers:namedAuth,body:`<c:calendar-multiget xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:"><d:prop><d:getetag/><c:calendar-data/></d:prop><d:href>${namedHrefs[0]}</d:href><d:href>${missingHref}</d:href><d:href>${foreignHref}</d:href><d:href>${namedHrefs[0]}</d:href></c:calendar-multiget>`});
const mixedXML=await mixedReport.text();assert.equal(mixedReport.status,207);assert.equal((mixedXML.match(/<D:response>/g)||[]).length,3);assert.equal((mixedXML.match(/BEGIN:VEVENT/g)||[]).length,1);for(const path of [missingHref,foreignHref])assert.ok(mixedXML.includes(`<D:href>${path}</D:href><D:status>HTTP/1.1 404 Not Found</D:status>`));
const malformedMulti=await fetch(named.data.url+'calendar/',{method:'REPORT',headers:namedAuth,body:`<c:calendar-multiget xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:"><d:href>/api/caldav/${named.data.username}/calendar/%ZZ.ics</d:href></c:calendar-multiget>`});assert.equal(malformedMulti.status,400);
for(const path of namedHrefs){const r=await fetch(root+path,{headers:namedAuth});assert.equal(r.status,200);const body=(await r.text()).replace(/\r?\n[ \t]/g,'');assert.ok(body.includes(`UID:${calendarId}-${rosterId}-`));}
assert.equal((await app('/caldav',{action:'revoke',calendarId,rosterId})).status,200);
// Calendar appearance is a reversible projection, with cache removals and stable UIDs.
const beforeAppearance=(await app('?id='+calendarId)).data;
const restUID=`${calendarId}-2026-10-21-shift@shiftly`,restURL=collection+encodeURIComponent(restUID)+'.ics';
assert.equal((await fetch(restURL,{headers:auth})).status,404);
const defaultsStatus=(await app('/caldav',{action:'status',calendarId,rosterId:'main'})).data;assert.equal(defaultsStatus.includeOff,false);assert.equal(defaultsStatus.compactTitles,true);
assert.notEqual((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:'yes',compactTitles:true})).status,200);
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:true,compactTitles:false})).status,200);
assert.equal((await fetch(restURL,{headers:auth})).status,200);
const visibleProps=await (await fetch(collection,{method:'PROPFIND',headers:auth})).text(),visibleToken=/<D:sync-token>([^<]+)<\/D:sync-token>/.exec(visibleProps)[1];
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:false,compactTitles:true})).status,200);
const hiddenReport=await (await fetch(collection,{method:'REPORT',headers:auth,body:`<d:sync-collection xmlns:d="DAV:"><d:sync-token>${visibleToken}</d:sync-token><d:prop><d:getetag/></d:prop></d:sync-collection>`})).text();
assert.ok(hiddenReport.includes(`<D:href>/api/caldav/${account.username}/calendar/${encodeURIComponent(restUID)}.ics</D:href><D:status>HTTP/1.1 404 Not Found</D:status>`));
assert.equal((await fetch(restURL,{headers:auth})).status,404);
const afterAppearance=(await app('?id='+calendarId)).data;for(const key of ['patterns','shifts','occurrences','events'])assert.deepEqual(afterAppearance[key],beforeAppearance[key]);
const standardOT={...shiftlyEvent,id:'appearance-overtime',title:'Overtime',date:'2026-11-03'};
assert.equal((await mutate(calendarId,[{kind:'event',id:standardOT.id,data:standardOT}])).status,200);
const otURL=collection+encodeURIComponent(`${calendarId}-${standardOT.id}-${standardOT.date}@shiftly`)+'.ics';
const otResource=await fetch(otURL,{headers:auth}),shortOT=await otResource.text();assert.match(shortOT,/SUMMARY:OT\r\n/);assert.match(shortOT,/DTEND:20261104T060000Z/);
assert.equal((await fetch(otURL,{method:'PUT',headers:{...auth,'If-Match':otResource.headers.get('etag')},body:shortOT.replace('DTSTART:20261103T180000Z','DTSTART:20261103T190000Z')})).status,204);
assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.id===standardOT.id).title,'Overtime');
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:true,compactTitles:false})).status,200);
assert.match(await (await fetch(otURL,{headers:auth})).text(),/SUMMARY:Overtime/);
assert.equal((await fetch(restURL,{headers:auth})).status,200);
assert.equal((await mutate(calendarId,[{kind:'event',id:standardOT.id,remove:true}])).status,200);
// Colour collections partition the actual roster without changing its source data.
const beforeColours=(await app('?id='+calendarId)).data;
const singleProps=await (await fetch(collection,{method:'PROPFIND',headers:auth})).text();
const singleToken=/<D:sync-token>([^<]+)<\/D:sync-token>/.exec(singleProps)[1];
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:false,compactTitles:true,groupByType:true})).status,200);
const homeXML=await (await fetch(account.url,{method:'PROPFIND',headers:{...auth,Depth:'1'}})).text();
for(const [group,colour] of [['calendar','#D96859FF'],['nights','#6469B4FF'],['overtime','#C48732FF'],['leave','#4E8E71FF'],['events','#7C6AA6FF']]){assert.ok(homeXML.includes(`/api/caldav/${account.username}/${group}/`));assert.ok(homeXML.includes(colour));}
assert.ok(!homeXML.includes(`/api/caldav/${account.username}/days-off/`));
const shiftNightUID=`${calendarId}-2026-10-20-shift@shiftly`;
async function colourSync(group,token=''){const response=await fetch(account.url+group+'/',{method:'REPORT',headers:auth,body:`<d:sync-collection xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:sync-token>${token}</d:sync-token><d:prop><d:getetag/><c:calendar-data/></d:prop></d:sync-collection>`});assert.equal(response.status,207,await response.clone().text());return response.text();}
const migratedDay=await colourSync('calendar',singleToken);assert.ok(migratedDay.includes(`<D:href>/api/caldav/${account.username}/calendar/${encodeURIComponent(shiftNightUID)}.ics</D:href><D:status>HTTP/1.1 404 Not Found</D:status>`));
const dayXML=await colourSync('calendar'),nightXML=await colourSync('nights');assert.match(dayXML,/SUMMARY:Day/);assert.ok(!dayXML.includes('SUMMARY:Night'));assert.match(nightXML,/SUMMARY:Night/);assert.ok(!nightXML.includes('SUMMARY:Day'));
assert.ok(dayXML.includes('2026-10-18-shift@shiftly'));assert.ok(dayXML.includes('2026-10-19-shift@shiftly'),'scheduled extra Day stays a normal Day');
const dstNight=await (await fetch(account.url+'nights/'+encodeURIComponent(`${calendarId}-2026-10-24-shift@shiftly`)+'.ics',{headers:auth})).text();assert.match(dstNight,/DTSTART:20261024T170000Z/);assert.match(dstNight,/DTEND:20261025T060000Z/);
const seen=new Set();for(const group of ['calendar','nights','overtime','leave','events']){const inventory=await colourSync(group);for(const match of inventory.matchAll(/UID:([^\r\n<]+)(?:\r?\n[ \t]([^\r\n<]+))?/g)){const uid=match[1]+(match[2]||'');assert.ok(!seen.has(uid),'UID must occur in only one colour: '+uid);seen.add(uid);}}
const nightURL=account.url+'nights/'+encodeURIComponent(shiftNightUID)+'.ics';assert.equal((await fetch(nightURL,{headers:auth})).status,200);assert.equal((await fetch(collection+encodeURIComponent(shiftNightUID)+'.ics',{headers:auth})).status,404);
// Changing an actual dated shift changes its colour, and removes the old resource.
const dayToken=/<D:sync-token>([^<]+)<\/D:sync-token>/.exec(dayXML)[1],moveDate='2026-10-23',moveUID=`${calendarId}-${moveDate}-shift@shiftly`;
assert.equal((await mutate(calendarId,[{kind:'occurrence',id:moveDate,data:{id:moveDate,date:moveDate,shiftId:'night'}}])).status,200);
const moved=await colourSync('calendar',dayToken);assert.ok(moved.includes(`<D:href>/api/caldav/${account.username}/calendar/${encodeURIComponent(moveUID)}.ics</D:href><D:status>HTTP/1.1 404 Not Found</D:status>`));assert.equal((await fetch(account.url+'nights/'+encodeURIComponent(moveUID)+'.ics',{headers:auth})).status,200);
assert.equal((await mutate(calendarId,[{kind:'occurrence',id:moveDate,remove:true}])).status,200);
// Overtime created in Apple Calendar inherits its selected calendar's type.
const colourOTUID='coloured-ot@example.invalid',colourOTURL=account.url+'overtime/'+encodeURIComponent(colourOTUID)+'.ics';
const colourOTBody=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${colourOTUID}\r\nDTSTART:20261106T180000Z\r\nDTEND:20261107T060000Z\r\nSUMMARY:Overtime\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
const otCreated=await fetch(colourOTURL,{method:'PUT',headers:auth,body:colourOTBody});assert.equal(otCreated.status,201);assert.ok(otCreated.headers.get('location').includes('/overtime/'));const otStored=await fetch(colourOTURL,{headers:auth});assert.equal(otStored.status,200);const otStoredBody=await otStored.text();assert.match(otStoredBody,/SUMMARY:OT/);assert.match(otStoredBody,/DTEND:20261107T060000Z/);
assert.equal((await fetch(colourOTURL,{method:'PUT',headers:{...auth,'If-Match':otStored.headers.get('etag')},body:otStoredBody.replace('DTSTART:20261106T180000Z','DTSTART:20261106T190000Z')})).status,204);
assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.date==='2026-11-06').entryType,'overtime');
assert.equal((await fetch(colourOTURL,{method:'DELETE',headers:auth})).status,204);
const colourLeaveUID='coloured-leave@example.invalid',colourLeaveURL=account.url+'leave/'+encodeURIComponent(colourLeaveUID)+'.ics';
const colourLeaveBody=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${colourLeaveUID}\r\nDTSTART;VALUE=DATE:20261108\r\nDTEND;VALUE=DATE:20261109\r\nSUMMARY:Study leave\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
assert.equal((await fetch(colourLeaveURL,{method:'PUT',headers:auth,body:colourLeaveBody})).status,201);assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.title==='Study leave').entryType,'leave');assert.match(await colourSync('leave'),/SUMMARY:Study leave/);assert.ok(!(await colourSync('calendar')).includes('SUMMARY:Study leave'));assert.equal((await fetch(colourLeaveURL,{method:'DELETE',headers:auth})).status,204);
// Calendar properties stay specific to a colour and survive settings changes.
assert.equal((await fetch(account.url+'nights/',{method:'PROPPATCH',headers:auth,body:patchBody})).status,207);
assert.match(await (await fetch(account.url+'nights/',{method:'PROPFIND',headers:auth})).text(),/#FF3B30FF/);
assert.match(await (await fetch(collection,{method:'PROPFIND',headers:auth})).text(),/#D96859FF/);
assert.equal((await fetch(account.url+'not-a-calendar/test.ics',{method:'PUT',headers:auth,body:colourOTBody})).status,404);
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:true,compactTitles:false,groupByType:false})).status,200);
assert.match(await (await fetch(collection+encodeURIComponent(shiftNightUID)+'.ics',{headers:auth})).text(),/SUMMARY:Night/);
const simplifiedHome=await (await fetch(account.url,{method:'PROPFIND',headers:{...auth,Depth:'1'}})).text();assert.ok(!simplifiedHome.includes('/nights/'));assert.ok(!simplifiedHome.includes('/overtime/'));assert.match(simplifiedHome,/<D:displayname>My roster &amp; Shiftly<\/D:displayname>/);
for(const group of ['nights','overtime','leave','events']){assert.equal((await fetch(account.url+group+'/',{method:'PROPFIND',headers:auth})).status,404);const cleared=await colourSync(group);assert.ok(!cleared.includes('<C:calendar-data>'));assert.match(cleared,/404 Not Found/);}
assert.equal((await fetch(colourOTURL,{method:'PUT',headers:auth,body:colourOTBody})).status,404);
const afterColours=(await app('?id='+calendarId)).data;for(const key of ['patterns','shifts','occurrences','events'])assert.deepEqual(afterColours[key],beforeColours[key]);
// A plain four-day cycle syncs exactly as saved, without a hidden extra Day.
const plainRoster='plain-dnro',plainPattern={id:'plain-four-day-cycle',rosterId:plainRoster,name:'Day Night Rest Off',items:['day','night','rest','off'],start:'2026-11-01',repeat:3};
assert.equal((await mutate(calendarId,[{kind:'roster',id:plainRoster,data:{id:plainRoster,name:'Plain DNRO',color:'#1570ef'}},{kind:'pattern',id:plainPattern.id,data:plainPattern}])).status,200);
const plainSetup=(await app('/caldav',{action:'create',calendarId,rosterId:plainRoster})).data;assert.equal(plainSetup.groupByType,false);const plainAuth={Authorization:'Basic '+Buffer.from(`${plainSetup.username}:${plainSetup.password}`).toString('base64')};
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:plainRoster,includeOff:true,compactTitles:true})).status,200);
const plainHome=await (await fetch(plainSetup.url,{method:'PROPFIND',headers:{...plainAuth,Depth:'1'}})).text();assert.equal((plainHome.match(/<C:calendar\/>/g)||[]).length,1);assert.match(plainHome,/<D:displayname>Shiftly<\/D:displayname>/);
const plainXML=await (await fetch(plainSetup.url+'calendar/',{method:'REPORT',headers:plainAuth,body:'<c:calendar-query xmlns:c="urn:ietf:params:xml:ns:caldav"/>'})).text();assert.equal((plainXML.match(/BEGIN:VEVENT/g)||[]).length,12);
for(const [index,title] of ['Day','Night','Rest','Off','Day','Night','Rest','Off','Day','Night','Rest','Off'].entries()){const date='2026-11-'+String(index+1).padStart(2,'0'),uid=`${calendarId}-${plainRoster}-${date}-shift@shiftly`,r=await fetch(plainSetup.url+'calendar/'+encodeURIComponent(uid)+'.ics',{headers:plainAuth});assert.equal(r.status,200);assert.ok((await r.text()).includes('SUMMARY:'+title+'\r\n'));}
const simpleOTUID='simple-ot-from-apple@example.invalid',simpleOTURL=plainSetup.url+'calendar/'+encodeURIComponent(simpleOTUID)+'.ics',simpleOTBody=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${simpleOTUID}\r\nDTSTART:20261106T180000Z\r\nDTEND:20261107T060000Z\r\nSUMMARY:OT\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
assert.equal((await fetch(simpleOTURL,{method:'PUT',headers:plainAuth,body:simpleOTBody})).status,201);assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.rosterId===plainRoster&&x.title==='OT').entryType,'overtime');assert.equal((await fetch(simpleOTURL,{method:'DELETE',headers:plainAuth})).status,204);
assert.equal((await app('/caldav',{action:'revoke',calendarId,rosterId:plainRoster})).status,200);
// Notes are opt-in, remain private when excluded, and can be edited or cleared when enabled.
const noteEvent={...shiftlyEvent,id:'notes-roundtrip',date:'2026-11-10',title:'Notes check',notes:'First line\nSecond line; café ☀️ & <test>',notesPrivate:false};
assert.equal((await app('/caldav',{action:'status',calendarId,rosterId:'main'})).data.includeNotes,false);
assert.equal((await mutate(calendarId,[{kind:'event',id:noteEvent.id,data:noteEvent}])).status,200);
const noteURL=collection+encodeURIComponent(`${calendarId}-${noteEvent.id}-${noteEvent.date}@shiftly`)+'.ics';
let noteResponse=await fetch(noteURL,{headers:auth}),noteBody=await noteResponse.text();assert.ok(!noteBody.includes('DESCRIPTION:'));assert.ok(!noteBody.includes('First line'));
let noteEdit=noteBody.replace('SUMMARY:Notes check','SUMMARY:Notes check edited').replace('END:VEVENT','DESCRIPTION:Must be ignored while notes are off\r\nEND:VEVENT');
assert.equal((await fetch(noteURL,{method:'PUT',headers:{...auth,'If-Match':noteResponse.headers.get('etag')},body:noteEdit})).status,204);
assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.id===noteEvent.id).notes,noteEvent.notes);
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:true,compactTitles:false,groupByType:false,includeNotes:true})).status,200);
assert.equal((await app('/caldav',{action:'status',calendarId,rosterId:'main'})).data.includeNotes,true);
noteResponse=await fetch(noteURL,{headers:auth});noteBody=await noteResponse.text();const unfoldedNotes=noteBody.replace(/\r?\n[ \t]/g,'');assert.ok(unfoldedNotes.includes('DESCRIPTION:First line\\nSecond line\\; café ☀️ & <test>'));
noteEdit=noteBody.replace(/DESCRIPTION:[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*/,'DESCRIPTION:Updated from Apple\\nSecond line');
assert.equal((await fetch(noteURL,{method:'PUT',headers:{...auth,'If-Match':noteResponse.headers.get('etag')},body:noteEdit})).status,204);
assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.id===noteEvent.id).notes,'Updated from Apple\nSecond line');
noteResponse=await fetch(noteURL,{headers:auth});noteBody=await noteResponse.text();
assert.equal((await fetch(noteURL,{method:'PUT',headers:{...auth,'If-Match':noteResponse.headers.get('etag')},body:noteBody.replace(/DESCRIPTION:[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*\r?\n/,'')})).status,204);
assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.id===noteEvent.id).notes,'');
assert.equal((await mutate(calendarId,[{kind:'event',id:noteEvent.id,data:{...noteEvent,notes:'Private note must never leave Shiftly',notesPrivate:true}}])).status,200);
noteResponse=await fetch(noteURL,{headers:auth});noteBody=await noteResponse.text();assert.ok(!noteBody.includes('Private note'));
assert.equal((await fetch(noteURL,{method:'PUT',headers:{...auth,'If-Match':noteResponse.headers.get('etag')},body:noteBody.replace('DESCRIPTION:','DESCRIPTION:Replace the private note')})).status,204);
let privateState=(await app('?id='+calendarId)).data.events.find(x=>x.id===noteEvent.id);assert.equal(privateState.notes,'Private note must never leave Shiftly');assert.equal(privateState.notesPrivate,true);
assert.equal((await mutate(calendarId,[{kind:'event',id:noteEvent.id,data:noteEvent}])).status,200);
assert.equal((await app('/caldav',{action:'configure',calendarId,rosterId:'main',includeOff:true,compactTitles:false,groupByType:false,includeNotes:false})).status,200);
assert.ok(!(await (await fetch(noteURL,{headers:auth})).text()).includes('First line'));
assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.id===noteEvent.id).notes,noteEvent.notes);
assert.equal((await mutate(calendarId,[{kind:'event',id:noteEvent.id,remove:true}])).status,200);
// Repeated requests reuse one UID; simultaneous writes cannot overwrite a winner after rejection.
const integrityUID='integrity-retry@example.invalid',integrityURL=collection+encodeURIComponent(integrityUID)+'.ics';
const integrityBody=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${integrityUID}\r\nDTSTART:20261115T180000Z\r\nDTEND:20261116T060000Z\r\nSUMMARY:Integrity original\r\nCATEGORIES:OVERTIME\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
assert.equal((await fetch(integrityURL,{method:'PUT',headers:{...auth,'If-None-Match':'*'},body:integrityBody})).status,201);
assert.equal((await fetch(integrityURL,{method:'PUT',headers:{...auth,'If-None-Match':'*'},body:integrityBody})).status,412);
let integrityResponse=await fetch(integrityURL,{headers:auth}),integrityICS=await integrityResponse.text();
const beforeRace=(await app('?id='+calendarId)).data;
const raceBodies=['Integrity winner A','Integrity winner B'].map(title=>integrityICS.replace('SUMMARY:Integrity original','SUMMARY:'+title));
const race=await Promise.all(raceBodies.map(body=>fetch(integrityURL,{method:'PUT',headers:{...auth,'If-Match':integrityResponse.headers.get('etag')},body})));
assert.deepEqual(race.map(r=>r.status).sort(),[204,412]);const winner=race.findIndex(r=>r.status===204),afterRace=(await app('?id='+calendarId)).data;
assert.equal(afterRace.calendar.revision,beforeRace.calendar.revision+1);assert.equal(afterRace.events.filter(x=>x.title.startsWith('Integrity ')).length,1);assert.equal(afterRace.events.find(x=>x.title.startsWith('Integrity ')).title,['Integrity winner A','Integrity winner B'][winner]);
assert.equal(afterRace.audit.filter(x=>!beforeRace.audit.some(old=>old.id===x.id)).length,1);
// Dragging a one-off event changes its actual date without changing its UID or losing other fields.
integrityResponse=await fetch(integrityURL,{headers:auth});integrityICS=await integrityResponse.text();
const movedICS=integrityICS.replace('DTSTART:20261115T180000Z','DTSTART:20261116T180000Z').replace('DTEND:20261116T060000Z','DTEND:20261117T060000Z');
assert.equal((await fetch(integrityURL,{method:'PUT',headers:{...auth,'If-Match':integrityResponse.headers.get('etag')},body:movedICS})).status,204);
assert.equal((await app('?id='+calendarId)).data.events.find(x=>x.title.startsWith('Integrity ')).date,'2026-11-16');assert.match(await (await fetch(integrityURL,{headers:auth})).text(),/UID:integrity-retry@example.invalid/);
const integrityState=(await app('?id='+calendarId)).data,integrityEvent=integrityState.events.find(x=>x.title.startsWith('Integrity '));
assert.equal((await mutate(calendarId,[{kind:'event',id:integrityEvent.id,data:{...integrityEvent,url:'https://example.invalid/details',cellLabel:'Important',notesPrivate:true,notes:'Keep private'}}])).status,200);
integrityResponse=await fetch(integrityURL,{headers:auth});integrityICS=await integrityResponse.text();assert.equal((await fetch(integrityURL,{method:'PUT',headers:{...auth,'If-Match':integrityResponse.headers.get('etag')},body:integrityICS.replace('LOCATION:','LOCATION:Updated location')})).status,204);
let integritySaved=(await app('?id='+calendarId)).data.events.find(x=>x.id===integrityEvent.id);assert.equal(integritySaved.url,'https://example.invalid/details');assert.equal(integritySaved.cellLabel,'Important');assert.equal(integritySaved.notes,'Keep private');
// Unsupported recurrence, multiple VEVENTs and multi-day event edits fail without changing data.
integrityResponse=await fetch(integrityURL,{headers:auth});integrityICS=await integrityResponse.text();const beforeUnsupported=(await app('?id='+calendarId)).data;
for(const body of [integrityICS.replace('END:VEVENT','RRULE:FREQ=DAILY\r\nEND:VEVENT'),integrityICS.replace('END:VCALENDAR','BEGIN:VEVENT\r\nUID:second@example.invalid\r\nEND:VEVENT\r\nEND:VCALENDAR'),integrityICS.replace('DTEND:20261117T060000Z','DTEND:20261119T060000Z')])assert.equal((await fetch(integrityURL,{method:'PUT',headers:{...auth,'If-Match':integrityResponse.headers.get('etag')},body})).status,400);
let afterUnsupported=(await app('?id='+calendarId)).data;assert.equal(afterUnsupported.calendar.revision,beforeUnsupported.calendar.revision);assert.deepEqual(afterUnsupported.events,beforeUnsupported.events);
// A subsequent Shiftly date change retains the mapped Apple UID, including its eventual deletion.
const currentIntegrity=(await app('?id='+calendarId)).data.events.find(x=>x.id===integrityEvent.id);
assert.equal((await mutate(calendarId,[{kind:'event',id:currentIntegrity.id,data:{...currentIntegrity,date:'2026-11-17'}}])).status,200);
assert.match(await (await fetch(integrityURL,{headers:auth})).text(),/DTSTART:20261117T180000Z/);
const beforeCross=(await app('?id='+calendarId)).data,crossResponse=await fetch(integrityURL,{headers:auth}),crossBody=await crossResponse.text(),crossEvent=beforeCross.events.find(x=>x.id===integrityEvent.id);
const crossResults=await Promise.all([app('',{action:'mutate',calendarId,revision:beforeCross.calendar.revision,operationId:crypto.randomUUID(),changes:[{kind:'event',id:crossEvent.id,data:{...crossEvent,title:'Shiftly cross winner'}}]}),fetch(integrityURL,{method:'PUT',headers:{...auth,'If-Match':crossResponse.headers.get('etag')},body:crossBody.replace(/^SUMMARY:[^\r\n]*/m,'SUMMARY:Apple cross winner')})]);
const afterCross=(await app('?id='+calendarId)).data;assert.equal(afterCross.calendar.revision,beforeCross.calendar.revision+1);
assert.ok(crossResults[0].status===200&&crossResults[1].status===412||crossResults[0].status===409&&crossResults[1].status===204);
assert.equal(afterCross.events.find(x=>x.id===crossEvent.id).title,crossResults[0].status===200?'Shiftly cross winner':'Apple cross winner');
assert.equal((await fetch(integrityURL,{method:'DELETE',headers:auth})).status,204);assert.equal((await fetch(integrityURL,{method:'DELETE',headers:auth})).status,404);
// Editing or deleting one occurrence must never rewrite a recurring source entry.
const recurring={...shiftlyEvent,id:'integrity-recurring',title:'Recurring protected',date:'2026-11-18',recurrence:'daily',until:'2026-11-20'};
assert.equal((await mutate(calendarId,[{kind:'event',id:recurring.id,data:recurring}])).status,200);const recurringURL=collection+encodeURIComponent(`${calendarId}-${recurring.id}-2026-11-19@shiftly`)+'.ics',recurringResponse=await fetch(recurringURL,{headers:auth}),recurringBody=await recurringResponse.text();
const recurringBefore=(await app('?id='+calendarId)).data;assert.equal((await fetch(recurringURL,{method:'PUT',headers:{...auth,'If-Match':recurringResponse.headers.get('etag')},body:recurringBody.replace('SUMMARY:Recurring protected','SUMMARY:Must not replace series')})).status,400);assert.equal((await fetch(recurringURL,{method:'DELETE',headers:auth})).status,409);assert.deepEqual((await app('?id='+calendarId)).data.events,recurringBefore.events);
assert.equal((await mutate(calendarId,[{kind:'event',id:recurring.id,remove:true}])).status,200);
// Removing a generated shift invalidates old inventories, so a fresh sync cannot retain ghosts.
const removalProps=await (await fetch(collection,{method:'PROPFIND',headers:auth})).text(),removalToken=/<D:sync-token>([^<]+)<\/D:sync-token>/.exec(removalProps)[1],removedDate='2026-12-01',removedUID=`${calendarId}-${removedDate}-shift@shiftly`;
assert.equal((await fetch(collection+encodeURIComponent(removedUID)+'.ics',{headers:auth})).status,200);
assert.equal((await mutate(calendarId,[{kind:'occurrence',id:removedDate,data:{id:removedDate,date:removedDate,shiftId:'',deleted:true}}])).status,200);
const removalResponse=await fetch(collection,{method:'REPORT',headers:auth,body:`<d:sync-collection xmlns:d="DAV:"><d:sync-token>${removalToken}</d:sync-token></d:sync-collection>`});assert.equal(removalResponse.status,403);assert.match(await removalResponse.text(),/valid-sync-token/);
const cleanInventory=await colourSync('calendar');assert.ok(!cleanInventory.includes(removedUID));assert.equal((await fetch(collection+encodeURIComponent(removedUID)+'.ics',{headers:auth})).status,404);
assert.equal((await mutate(calendarId,[{kind:'occurrence',id:removedDate,remove:true}])).status,200);assert.equal((await fetch(collection+encodeURIComponent(removedUID)+'.ics',{headers:auth})).status,200);
const beforeDisconnect=(await app('?id='+calendarId)).data;
assert.equal((await app('/caldav',{action:'revoke',calendarId,rosterId:'main'})).status,200);
assert.equal((await app('/caldav',{action:'status',calendarId,rosterId:'main'})).data.connected,false);
assert.equal((await fetch(account.url,{method:'OPTIONS',headers:auth})).status,404);
const afterDisconnect=(await app('?id='+calendarId)).data;
for(const key of ['patterns','shifts','occurrences','events'])assert.deepEqual(afterDisconnect[key],beforeDisconnect[key]);
const reconnected=await app('/caldav',{action:'create',calendarId,rosterId:'main'});assert.equal(reconnected.status,200);assert.notEqual(reconnected.data.username,account.username);
const newAuth={Authorization:'Basic '+Buffer.from(`${reconnected.data.username}:${reconnected.data.password}`).toString('base64')};assert.equal((await fetch(reconnected.data.url,{method:'OPTIONS',headers:newAuth})).status,200);assert.equal((await fetch(account.url,{method:'OPTIONS',headers:auth})).status,404);
const beforeReset=(await app('?id='+calendarId)).data;
const replacement=await app('/caldav',{action:'reset',calendarId,rosterId:'main'});assert.equal(replacement.status,200);assert.equal(replacement.data.username,reconnected.data.username);assert.equal(replacement.data.url,reconnected.data.url);assert.notEqual(replacement.data.password,reconnected.data.password);
assert.equal((await fetch(reconnected.data.url,{method:'OPTIONS',headers:newAuth})).status,401);
const resetAuth={Authorization:'Basic '+Buffer.from(`${replacement.data.username}:${replacement.data.password}`).toString('base64')};assert.equal((await fetch(replacement.data.url,{method:'OPTIONS',headers:resetAuth})).status,200);
const afterReset=(await app('?id='+calendarId)).data;for(const key of ['patterns','shifts','occurrences','events'])assert.deepEqual(afterReset[key],beforeReset[key]);
const recovered=await app('/caldav',{action:'status',calendarId,rosterId:'main'});assert.equal(recovered.data.username,replacement.data.username);assert.equal(recovered.data.url,replacement.data.url);assert.equal(recovered.data.password,undefined);assert.equal(recovered.data.passwordHash,undefined);
console.log('CalDAV PASS: colour discovery and unique event placement, collection changes and rollback, overnight DST, overtime and leave edits, folded UIDs, optional notes round-trip and privacy, atomic concurrent edits, retry deduplication, safe date moves, recurrence protection, credentials and reconnect.');
