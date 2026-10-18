import {env} from 'cloudflare:workers';
import {addDays,dayNumber,calendarDate,resolveShift,Snapshot,zonedInstant} from './engine';
import {calendarICS,foldCalendarLine} from './ics';
import {calendarRosters,rosterSnapshot} from './rosters';
import {validateRecord} from './validation';
import {calendarGroups,calendarDisplayOptions} from './calendar-appearance';

const baseHeaders={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const syncVersion='v5';
const dav='1, calendar-access, sync-collection',allow='OPTIONS, PROPFIND, PROPPATCH, REPORT, GET, HEAD, PUT, DELETE';
const responseXML=(body:string,status=207)=>new Response(`<?xml version="1.0" encoding="utf-8"?>${body}`,{status,headers:{...baseHeaders,'Content-Type':'application/xml; charset=utf-8','DAV':dav}});
const xmlEscape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
async function sha(s:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));}
async function tag(s:string){return `"${(await sha(s.replace(/^DTSTAMP:[^\r\n]+/gm,'DTSTAMP:20000101T000000Z'))).slice(0,32)}"`;}
function basic(value:string|null){if(!value?.startsWith('Basic '))return null;try{return atob(value.slice(6));}catch{return null;}}
export function isCalDAVRequest(request:Request){const path=new URL(request.url).pathname;return path==='/api/caldav'||path.startsWith('/api/caldav/')||path==='/.well-known/caldav'||(['PROPFIND','OPTIONS'].includes(request.method.toUpperCase())&&(path==='/'||path==='/principals'||path==='/principals/'||/^\/calendar\/dav\/s[a-f0-9]{24}\/user\/?$/.test(path)));}
function unxml(value:string){return value.replace(/&#x([a-f\d]+);/gi,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,parseInt(n,16)))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Number(n)))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
function tokenPrefix(a:any){return `urn:shiftly:sync:${syncVersion}:${a.calendar.id}:${a.meta.rosterId}:${a.group||'calendar'}:${a.meta.syncEpoch?'e'+a.meta.syncEpoch+':':''}`;}
function syncToken(a:any){return `${tokenPrefix(a)}${a.calendar.revision}`;}
function ctag(a:any){return `${syncVersion}-${a.group||'home'}-${a.calendar.revision}`;}
function href(username:string,uid:string,group='calendar'){return `/api/caldav/${username}/${group}/${encodeURIComponent(uid)}.ics`;}
function resourceGroup(item:{uid:string;ics:string},timezone:string){const f=getFields(item.ics),category=f.CATEGORIES?.value.toLowerCase();if(category==='overtime')return 'overtime';if(['leave','sick'].includes(category||''))return 'leave';if(item.uid.endsWith('-shift@shiftly')){if(category==='off')return 'days-off';if(['work','training'].includes(category||'')){const start=f.DTSTART&&parseDate(f.DTSTART,timezone),end=f.DTEND&&parseDate(f.DTEND,timezone);return start&&end&&end.date>start.date?'nights':'calendar';}}return 'events';}
function propstat(s:string){return `<D:propstat><D:prop>${s}</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat>`;}
type XMLElement={name:string;xml:string;inner:string;namespace:string};
function xmlChildren(source:string,bindings:Record<string,string>):XMLElement[]{
 const result:XMLElement[]=[],tokens=/<(\/?)([\w-]+(?::[\w-]+)?)([^>]*?)(\/?)>/g;let depth=0,start=0,contentStart=0,name='',ns='';
 for(const token of source.matchAll(tokens)){
  const closing=!!token[1],empty=!!token[4];
  if(!closing&&depth===0){start=token.index!;contentStart=start+token[0].length;name=token[2];const local={...bindings};for(const attr of token[3].matchAll(/xmlns(?::([\w-]+))?=["']([^"']*)["']/g))local[attr[1]||'']=attr[2];ns=local[name.includes(':')?name.split(':')[0]:'']||'';}
  if(closing)depth--;else if(!empty)depth++;
  if(depth===0)result.push({name:name.split(':').pop()!,namespace:ns,xml:source.slice(start,token.index!+token[0].length),inner:empty?'':source.slice(contentStart,token.index)});
 }
 return result;
}
const propertyNamespaces={D:'DAV:',C:'urn:ietf:params:xml:ns:caldav',CS:'http://calendarserver.org/ns/',I:'http://apple.com/ns/ical/'};
function requestedProperties(body:string){
 const bindings:Record<string,string>={};for(const attr of body.matchAll(/xmlns(?::([\w-]+))?=["']([^"']*)["']/g))bindings[attr[1]||'']=attr[2];
 const match=/<(?:[\w-]+:)?prop\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?prop\s*>/i.exec(body);
 return match?xmlChildren(match[1],bindings):null;
}
function selectedPropstat(properties:string,requested:XMLElement[]|null){
 if(!requested)return propstat(properties);
 const available=xmlChildren(properties,propertyNamespaces),found:string[]=[],missing:string[]=[];
 for(const prop of requested){const value=available.find(x=>x.name===prop.name&&x.namespace===prop.namespace);if(value)found.push(value.xml);else missing.push(`<P:${prop.name} xmlns:P="${xmlEscape(prop.namespace)}"/>`);}
 return (found.length?propstat(found.join('')):'')+(missing.length?`<D:propstat><D:prop>${missing.join('')}</D:prop><D:status>HTTP/1.1 404 Not Found</D:status></D:propstat>`:'');
}
function unfold(s:string){return s.replace(/\r?\n[ \t]/g,'').split(/\r?\n/);}
function splitEvents(ics:string){const result:{uid:string;ics:string}[]=[];for(const part of ics.split('BEGIN:VEVENT').slice(1)){const body='BEGIN:VEVENT'+part.split('END:VEVENT')[0]+'END:VEVENT',uid=unfold(body).find(line=>line.startsWith('UID:'))?.slice(4);if(uid)result.push({uid,ics:`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Shiftly//CalDAV//EN\r\n${body.replace(/\r?\n/g,'\r\n')}\r\nEND:VCALENDAR\r\n`});}return result;}
function getFields(ics:string){const out:Record<string,{value:string;params:string}>={};for(const line of unfold(ics)){const at=line.indexOf(':');if(at<0)continue;const key=line.slice(0,at);out[key.split(';')[0].toUpperCase()]={value:line.slice(at+1),params:key};}return out;}
function unescapeText(s:string){return s.replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');}
const calendarFormatters=new Map<string,Intl.DateTimeFormat>();
function calendarParts(instant:Date,timezone:string){if(!calendarFormatters.has(timezone))calendarFormatters.set(timezone,new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));return Object.fromEntries(calendarFormatters.get(timezone)!.formatToParts(instant).map(x=>[x.type,x.value]));}
function parseDate(f:{value:string;params:string},calendarTZ:string){const value=f.value;if(!/^\d{8}(T\d{6}Z?)?$/.test(value))throw new Error('Unsupported calendar date');let date=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`,time=value.includes('T')?`${value.slice(9,11)}:${value.slice(11,13)}`:'';if(value.endsWith('Z')){const instant=new Date(`${date}T${time}:${value.slice(13,15)}Z`),p=calendarParts(instant,calendarTZ);date=`${p.year}-${p.month}-${p.day}`;time=time?`${p.hour}:${p.minute}`:'';}else{const zone=/TZID=([^;:]+)/.exec(f.params)?.[1];if(zone&&zone!==calendarTZ&&time){const instant=zonedInstant(date,time,zone),p=calendarParts(new Date(instant),calendarTZ);date=`${p.year}-${p.month}-${p.day}`;time=`${p.hour}:${p.minute}`;}}return {date,time};}
function validBody(s:string){if(s.length>128000||!s.includes('BEGIN:VCALENDAR')||!s.includes('END:VCALENDAR')||(s.match(/BEGIN:VEVENT/g)||[]).length!==1||(s.match(/END:VEVENT/g)||[]).length!==1)throw new Error('Invalid or oversized calendar event');if(/BEGIN:VALARM|ATTACH;|ATTACH:|BEGIN:VTODO|BEGIN:VJOURNAL|^(?:RRULE|RDATE|EXDATE|RECURRENCE-ID|DURATION)[;:]/im.test(s))throw new Error('Unsupported calendar event data');}

async function getAccount(request:Request){
 if(!env.DB)return null;const originalPath=new URL(request.url).pathname,decoded=basic(request.headers.get('authorization'));if(!decoded)return {unauthorized:true};const colon=decoded.indexOf(':');if(colon<1)return {unauthorized:true};
 const parts=originalPath.split('/').filter(Boolean),username=originalPath.startsWith('/api/caldav/')&&parts[2]?parts[2]:decoded.slice(0,colon);if(!/^s[a-f0-9]{24}$/.test(username)||decoded.slice(0,colon)!==username)return {unauthorized:true};
 if(!originalPath.startsWith(`/api/caldav/${username}`)){parts.splice(0,parts.length,'api','caldav',username,...(originalPath.startsWith('/principals')||originalPath.startsWith('/calendar/dav/')?['principal']:[]));}
 const row:any=await env.DB.prepare("SELECT id,calendar_id,author,data FROM calendar_records WHERE id=? AND kind='calendar_caldav' AND private=1").bind('caldav_'+username).first();if(!row)return null;const meta=JSON.parse(String(row.data));if(meta.username!==username||meta.passwordHash!==await sha(decoded.slice(colon+1)))return {unauthorized:true};
 const calendar:any=await env.DB.prepare('SELECT id,owner,name,timezone,settings,revision FROM calendars WHERE id=? AND owner=?').bind(row.calendar_id,row.author).first();if(!calendar)return null;
 const rows=(await env.DB.prepare("SELECT kind,data FROM calendar_records WHERE calendar_id=? AND kind IN ('roster','shift','pattern','occurrence','event','caldav_tombstone','caldav_uid') AND (private=0 OR author=?) ORDER BY rowid").bind(calendar.id,calendar.owner).all()).results as any[];
 const raw:any={calendar:{...calendar,settings:JSON.parse(String(calendar.settings))},role:'owner',rosters:[],shifts:[],patterns:[],occurrences:[],events:[],members:[],invites:[],audit:[],tombstones:[],uidmaps:[]};
 for(const row of rows){const key=({roster:'rosters',shift:'shifts',pattern:'patterns',occurrence:'occurrences',event:'events',caldav_tombstone:'tombstones',caldav_uid:'uidmaps'} as Record<string,string>)[row.kind];if(key)raw[key].push(JSON.parse(String(row.data)));}
 const roster=calendarRosters(raw).find((item:any)=>item.id===meta.rosterId&&!item.archived);if(!roster)return null;const snapshot=rosterSnapshot(raw,meta.rosterId) as Snapshot;
 const needsEvents=!['OPTIONS','PROPPATCH'].includes(request.method)&&!(request.method==='PROPFIND'&&!(calendarGroups.some(group=>group.id===parts[3])&&(request.headers.get('depth')||'0')==='1'));
 const today=calendarDate(Date.now(),calendar.timezone),start=addDays(today,-365),end=addDays(today,1095),ics=needsEvents?calendarICS({...snapshot,events:snapshot.events.map(event=>event.notesPrivate?{...event,notes:''}:event)},start,end,meta.includeNotes===true,{sequence:Number(calendar.revision)||0,calendarName:`${calendar.name} · ${roster.name}`,includeOff:true}):'';
 const allResources=splitEvents(ics);for(const map of raw.uidmaps.filter((x:any)=>x.rosterId===meta.rosterId)){const source=snapshot.events.find(event=>event.id===map.eventId),date=source&&(!source.recurrence||source.recurrence==='none')?source.date:map.date,standard=`${calendar.id}${meta.rosterId==='main'?'':`-${meta.rosterId}`}-${map.eventId}-${date}@shiftly`,resource=allResources.find((x:any)=>x.uid===standard);if(resource){resource.ics=resource.ics.replace(/^UID:[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*/m,foldCalendarLine(`UID:${map.uid}`));resource.uid=map.uid;}}
 const options=calendarDisplayOptions(meta),group=parts[3]||'calendar';
 if(options.compactTitles)for(const item of allResources){const fields=getFields(item.ics);if(fields.CATEGORIES?.value.toLowerCase()==='overtime'&&fields.SUMMARY?.value==='Overtime')item.ics=item.ics.replace('SUMMARY:Overtime\r\n','SUMMARY:OT\r\n');}
 const groupsByUID=new Map(allResources.map(item=>[item.uid,resourceGroup(item,calendar.timezone)]));
 const resources=allResources.filter(item=>(options.includeOff||groupsByUID.get(item.uid)!=='days-off')&&(options.groupByType?groupsByUID.get(item.uid)===group:group==='calendar'));
 const visibleUIDs=new Set(resources.map(item=>item.uid)),hiddenResources=allResources.filter(item=>!visibleUIDs.has(item.uid));
 return {db:env.DB,row,calendar,meta,username,parts,snapshot,ics,resources,allResources,hiddenResources,group,roster,options,tombstones:raw.tombstones,uidmaps:raw.uidmaps};
}

async function writeEvent(a:any,ics:string,deleted=false){
 validBody(ics);const f=getFields(ics),uid=f.UID?.value;if(!uid||uid.length>512)throw new Error('Missing or oversized UID');const prefix=a.calendar.id+(a.meta.rosterId==='main'?'':`-${a.meta.rosterId}`)+'-';const suffix=uid.startsWith(prefix)?uid.slice(prefix.length):'';
 const shift=/^(\d{4}-\d{2}-\d{2})-shift@shiftly$/.exec(suffix),event=suffix?/^(.+)-(\d{4}-\d{2}-\d{2})@shiftly$/.exec(suffix):null,startField=f.DTSTART;
 let date='',time='',endTime='';if(startField){const p=parseDate(startField,a.calendar.timezone);date=p.date;time=p.time;}if(shift){if(date&&date!==shift[1])throw new Error('Change roster shift dates in Shiftly');date=shift[1];}if(!date)throw new Error('Event needs a supported start date');
 const expectedRevision=Number(a.calendar.revision)||0,changes:any[]=[];
 if(shift){const oid=a.meta.rosterId==='main'?date:`${a.meta.rosterId}:${date}`;
  if(deleted)changes.push({kind:'occurrence',id:oid,data:{id:oid,date,rosterId:a.meta.rosterId,shiftId:'',deleted:true}});
  else{if(!f.DTSTART||!f.DTEND)throw new Error('Shift events need a start and end');const original=resolveShift(a.snapshot,date);if(!original)throw new Error('Add the shift in Shiftly before editing it here');const id=`caldav_${(await sha(uid)).slice(0,24)}`;let cloned:any;if(time){const end=parseDate(f.DTEND,a.calendar.timezone);endTime=end.time;if(!endTime)throw new Error('Timed shift needs an end time');cloned={...original,id,name:unescapeText(f.SUMMARY?.value||original.name).slice(0,60),start:time,end:endTime,durationDays:dayNumber(end.date)-dayNumber(date),location:unescapeText(f.LOCATION?.value||'').slice(0,300)};}else{if(parseDate(f.DTEND,a.calendar.timezone).date!==addDays(date,1))throw new Error('Use one date per roster entry');const category=(f.CATEGORIES?.value||'').toLowerCase(),allDayCategory=category==='leave'?'Leave':category==='sick'?'Sick':category==='off'?'Off':category==='other'?'Other':original.category;if(['Work','Training'].includes(allDayCategory))throw new Error('A working shift needs start and end times');cloned={...original,id,name:unescapeText(f.SUMMARY?.value||original.name).slice(0,60),start:'',end:'',category:allDayCategory,location:unescapeText(f.LOCATION?.value||'').slice(0,300)};}changes.push({kind:'shift',id,data:cloned},{kind:'occurrence',id:oid,data:{id:oid,date,rosterId:a.meta.rosterId,shiftId:id}});}
 }else{
  const id=event?event[1]:`caldav_${(await sha(uid)).slice(0,24)}`;
  const previous=a.snapshot.events.find((item:any)=>item.id===id);if(previous?.recurrence&&previous.recurrence!=='none')throw new Error('Edit repeating entries in Shiftly');
  if(deleted)changes.push({kind:'event',id,remove:true});
  else{if(!f.SUMMARY)throw new Error('Calendar event needs a title');if(f.DTEND){const end=parseDate(f.DTEND,a.calendar.timezone);endTime=end.time;if(time&&(!endTime||end.date!==addDays(date,endTime<=time?1:0))||!time&&(endTime||end.date!==addDays(date,1)))throw new Error('Use one date or one overnight span per entry');}const category=(f.CATEGORIES?.value||'').toLowerCase(),entryType=['overtime','leave','appointment'].includes(category)?category:(previous?.entryType||(/^\s*(?:ot|overtime)\b/i.test(unescapeText(f.SUMMARY.value))?'overtime':/^\s*(?:(?:annual|study|sick|vacation)\s+)?leave\b/i.test(unescapeText(f.SUMMARY.value))?'leave':'custom'));changes.push({kind:'event',id,data:{...previous,id,date,rosterId:a.meta.rosterId,title:previous?.title==='Overtime'&&entryType==='overtime'&&a.meta.compactTitles!==false&&f.SUMMARY.value==='OT'?previous.title:unescapeText(f.SUMMARY.value).slice(0,120),emoji:previous?.emoji||(entryType==='overtime'?'⏱️':entryType==='leave'?'🌿':'📅'),time,endTime:endTime||undefined,notes:previous?.notesPrivate||a.meta.includeNotes!==true?(previous?.notes||''):(f.DESCRIPTION?unescapeText(f.DESCRIPTION.value).slice(0,10000):''),notesPrivate:previous?.notesPrivate,private:previous?.private??true,entryType,location:unescapeText(f.LOCATION?.value||previous?.location||'').slice(0,300),reminders:previous?.reminders||[]}});}
 }
 const state=await a.db.prepare('SELECT revision FROM calendars WHERE id=? AND revision=?').bind(a.calendar.id,expectedRevision).first();if(!state)throw new Error('CONFLICT');const stmts:any[]=[];
 for(const change of changes){const key=a.calendar.id+'_'+change.id,existing:any=await a.db.prepare('SELECT kind,author,data FROM calendar_records WHERE id=? AND calendar_id=?').bind(key,a.calendar.id).first();if(existing&&((existing.kind!==change.kind)||existing.author!==a.row.author||['event','occurrence'].includes(change.kind)&&(JSON.parse(String(existing.data)).rosterId||'main')!==a.meta.rosterId))throw new Error('CONFLICT');if(change.remove){if(existing)stmts.push(a.db.prepare('DELETE FROM calendar_records WHERE id=? AND calendar_id=? AND EXISTS(SELECT 1 FROM calendars WHERE id=? AND revision=?)').bind(key,a.calendar.id,a.calendar.id,expectedRevision));continue;}const data=validateRecord(change.kind,change.data);stmts.push(a.db.prepare('INSERT INTO calendar_records(id,calendar_id,kind,date,author,private,data) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM calendars WHERE id=? AND revision=?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,date=excluded.date,private=excluded.private').bind(key,a.calendar.id,change.kind,data.date||null,a.row.author,change.kind==='event'&&data.private?1:0,JSON.stringify(data),a.calendar.id,expectedRevision));}
 const mappingId=`uid_${(await sha(uid)).slice(0,32)}`;
 if(!shift&&!deleted){if(a.uidmaps.some((map:any)=>map.uid===uid&&map.rosterId!==a.meta.rosterId))throw new Error('CONFLICT');const mapping={id:mappingId,uid,rosterId:a.meta.rosterId,date,eventId:event?event[1]:`caldav_${(await sha(uid)).slice(0,24)}`};stmts.push(a.db.prepare('INSERT OR REPLACE INTO calendar_records(id,calendar_id,kind,date,author,private,data) SELECT ?,?,?,?,?,1,? WHERE EXISTS(SELECT 1 FROM calendars WHERE id=? AND revision=?)').bind(a.calendar.id+'_'+mappingId,a.calendar.id,'caldav_uid',date,a.row.author,JSON.stringify(mapping),a.calendar.id,expectedRevision));}
 if(deleted)stmts.push(a.db.prepare("DELETE FROM calendar_records WHERE calendar_id=? AND id=? AND kind='caldav_uid' AND EXISTS(SELECT 1 FROM calendars WHERE id=? AND revision=?)").bind(a.calendar.id,a.calendar.id+'_'+mappingId,a.calendar.id,expectedRevision));
 if(deleted){const tombId=`tomb_${(await sha(uid)).slice(0,32)}`,nextRevision=expectedRevision+1;stmts.push(a.db.prepare('INSERT OR REPLACE INTO calendar_records(id,calendar_id,kind,date,author,private,data) SELECT ?,?,?,NULL,?,1,? WHERE EXISTS(SELECT 1 FROM calendars WHERE id=? AND revision=?)').bind(a.calendar.id+'_'+tombId,a.calendar.id,'caldav_tombstone',a.row.author,JSON.stringify({id:tombId,uid,rosterId:a.meta.rosterId,revision:nextRevision}),a.calendar.id,expectedRevision));}
 stmts.push(a.db.prepare('INSERT INTO operations(id,calendar_id,author,at,summary) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM calendars WHERE id=? AND revision=?)').bind(crypto.randomUUID(),a.calendar.id,a.row.author,new Date().toISOString(),deleted?'Event removed from Apple Calendar':'Event updated from Apple Calendar',a.calendar.id,expectedRevision));
 stmts.push(a.db.prepare('UPDATE calendars SET revision=revision+1 WHERE id=? AND revision=?').bind(a.calendar.id,expectedRevision));const result=await a.db.batch(stmts);if(!result[result.length-1].meta.changes)throw new Error('CONFLICT');return uid;
}

export async function handleCalDAV(request:Request){
 if(new URL(request.url).pathname==='/.well-known/caldav')return new Response(null,{status:307,headers:{...baseHeaders,Location:'/api/caldav/'}});
 const a:any=await getAccount(request);if(!a)return new Response('Not found',{status:404,headers:baseHeaders});if(a.unauthorized)return new Response('Authentication required',{status:401,headers:{...baseHeaders,'WWW-Authenticate':'Basic realm="Shiftly Calendar"'}});
 const path=a.parts.slice(3),root=`/api/caldav/${a.username}/`,calendar=`${root}${a.group}/`,method=request.method.toUpperCase();
 // Retired colour collections disappear from discovery and cannot accept stale writes.
 const retired=calendarGroups.some(item=>item.id===a.group)&&(a.options.groupByType?!a.options.includeOff&&a.group==='days-off':a.group!=='calendar');
 if(retired){
  if(method!=='REPORT')return new Response('Calendar no longer available; refresh the Shiftly account.',{status:404,headers:baseHeaders});
  const removed=[...new Set([...a.allResources,...a.tombstones].map((item:any)=>item.uid))] as string[];
  return responseXML(`<D:multistatus xmlns:D="DAV:">${removed.map(uid=>`<D:response><D:href>${href(a.username,uid,a.group)}</D:href><D:status>HTTP/1.1 404 Not Found</D:status></D:response>`).join('')}<D:sync-token>${syncToken(a)}</D:sync-token></D:multistatus>`);
 }
 if(method==='OPTIONS')return new Response(null,{status:200,headers:{...baseHeaders,'DAV':dav,'Allow':allow}});
 if(method==='PROPFIND'){
  const body=await request.text();if(body.length>64000||/<!DOCTYPE|<!ENTITY/i.test(body))return new Response('Invalid properties',{status:400,headers:baseHeaders});const requested=requestedProperties(body);
  const relative=path.join('/'),depth=request.headers.get('depth')||'0',principalPath=`${root}principal/`,properties=(a.group==='calendar'&&!a.options.groupByType?a.meta.properties:a.meta.collectionProperties?.[a.group])||{};
  const identity=`<D:current-user-principal><D:href>${principalPath}</D:href></D:current-user-principal><D:principal-URL><D:href>${principalPath}</D:href></D:principal-URL><D:owner><D:href>${principalPath}</D:href></D:owner>`,privileges='<D:current-user-privilege-set><D:privilege><D:read/></D:privilege><D:privilege><D:write/></D:privilege></D:current-user-privilege-set>';
  const principal=`${identity}<D:displayname>Shiftly account</D:displayname><D:resourcetype><D:principal/></D:resourcetype><C:calendar-home-set><D:href>${root}</D:href></C:calendar-home-set>`;
  const home=`${identity}<D:displayname>Shiftly calendars</D:displayname><D:resourcetype><D:collection/></D:resourcetype><C:calendar-home-set><D:href>${root}</D:href></C:calendar-home-set><CS:getctag>${ctag(a)}</CS:getctag>`;
  const collection=(group:string)=>{const spec=calendarGroups.find(item=>item.id===group)!,properties=(group==='calendar'&&!a.options.groupByType?a.meta.properties:a.meta.collectionProperties?.[group])||{};return `${identity}${privileges}<D:displayname>${xmlEscape(properties.displayname||(a.options.groupByType?`${spec.name} · ${a.roster.name}`:'Shiftly'))}</D:displayname><D:resourcetype><D:collection/><C:calendar/></D:resourcetype><I:calendar-color>${xmlEscape(properties.color||(a.options.groupByType?spec.color+'FF':'#007AFFFF'))}</I:calendar-color><I:calendar-order>${properties.order||String(calendarGroups.findIndex(item=>item.id===group))}</I:calendar-order><C:supported-calendar-component-set><C:comp name="VEVENT"/></C:supported-calendar-component-set><D:supported-report-set><D:supported-report><D:report><C:calendar-query/></D:report></D:supported-report><D:supported-report><D:report><C:calendar-multiget/></D:report></D:supported-report><D:supported-report><D:report><D:sync-collection/></D:report></D:supported-report></D:supported-report-set><D:sync-token>${syncToken({...a,group})}</D:sync-token><CS:getctag>${ctag({...a,group})}</CS:getctag>`;};
  const entry=(url:string,props:string)=>`<D:response><D:href>${url}</D:href>${selectedPropstat(props,requested)}</D:response>`;
  let rs=relative==='principal'?entry(principalPath,principal):calendarGroups.some(item=>item.id===relative)?entry(calendar,collection(relative)):relative===''?entry(root,home)+(depth==='1'?calendarGroups.filter(item=>a.options.groupByType?(a.options.includeOff||item.id!=='days-off'):item.id==='calendar').map(item=>entry(`${root}${item.id}/`,collection(item.id))).join(''):''):'';
  if(calendarGroups.some(item=>item.id===relative)&&depth==='1')rs+=(await Promise.all(a.resources.map(async(item:any)=>entry(href(a.username,item.uid,a.group),`<D:resourcetype/><D:getcontenttype>text/calendar; charset=utf-8</D:getcontenttype><D:getetag>${await tag(item.ics)}</D:getetag>`)))).join('');
  if(!rs)return new Response('Not found',{status:404,headers:baseHeaders});
  return responseXML(`<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/" xmlns:I="http://apple.com/ns/ical/">${rs}</D:multistatus>`);
 }
 if(!['PROPFIND','OPTIONS'].includes(method)&&(!calendarGroups.some(item=>item.id===path[0])||path.length>2))return new Response('Not found',{status:404,headers:baseHeaders});
 if(method==='PROPPATCH'){
  if(!calendarGroups.some(item=>item.id===path.join('/')))return new Response('Forbidden',{status:403,headers:baseHeaders});
  const body=await request.text();if(body.length>64000||/<!DOCTYPE|<!ENTITY/i.test(body))return new Response('Invalid properties',{status:400,headers:baseHeaders});
  const properties={...((a.group==='calendar'&&!a.options.groupByType?a.meta.properties:a.meta.collectionProperties?.[a.group])||{})},changed:string[]=[],rejected:string[]=[];
  for(const operation of body.matchAll(/<(?:[\w-]+:)?(set|remove)\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?\1\s*>/gi)){
   const prop=/<(?:[\w-]+:)?prop\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?prop\s*>/i.exec(operation[2]);if(!prop)continue;
   for(const match of prop[1].matchAll(/<(?:[\w-]+:)?([\w-]+)(?:\s[^>]*)?(?:\s*\/>|>([\s\S]*?)<\/(?:[\w-]+:)?\1\s*>)/g)){
    const name=match[1],key=({'displayname':'displayname','calendar-color':'color','calendar-order':'order'} as Record<string,string>)[name],value=unxml((match[2]||'').trim());
    if(!key||(operation[1].toLowerCase()==='set'&&(value.length>160||name==='calendar-color'&&!/^#[a-f\d]{6}([a-f\d]{2})?$/i.test(value)||name==='calendar-order'&&!/^\d{1,6}$/.test(value)))){rejected.push(name);continue;}
    changed.push(name);if(operation[1].toLowerCase()==='remove')delete properties[key];else properties[key]=value;
   }
  }
  const element=(name:string)=>`<${name==='displayname'?'D':'I'}:${name}/>`;
  if(!changed.length&&!rejected.length)return new Response('Invalid properties',{status:400,headers:baseHeaders});
  if(!rejected.length)await a.db.batch([a.db.prepare("UPDATE calendar_records SET data=json_set(data,?,json(?)) WHERE id=? AND calendar_id=? AND author=?").bind(a.group==='calendar'&&!a.options.groupByType?'$.properties':`$.collectionProperties."${a.group}"`,JSON.stringify(properties),a.row.id,a.calendar.id,a.row.author),a.db.prepare('UPDATE calendars SET revision=revision+1 WHERE id=?').bind(a.calendar.id)]);
  const status=(names:string[],code:string)=>names.length?`<D:propstat><D:prop>${names.map(element).join('')}</D:prop><D:status>HTTP/1.1 ${code}</D:status></D:propstat>`:'';
  return responseXML(`<D:multistatus xmlns:D="DAV:" xmlns:I="http://apple.com/ns/ical/"><D:response><D:href>${calendar}</D:href>${status(changed,rejected.length?'424 Failed Dependency':'200 OK')}${status(rejected,'403 Forbidden')}</D:response></D:multistatus>`);
 }
 if(method==='REPORT'){
  const body=await request.text();if(body.length>100000||/<!DOCTYPE|<!ENTITY/i.test(body))return new Response('Request too large',{status:413,headers:baseHeaders});const requested=requestedProperties(body);let items=a.resources;
  const missingHrefs:string[]=[];
  if(/calendar-multiget/i.test(body)){
   // Return one result per requested resource, including deletions between
   // Apple's inventory and download. Never resolve a different collection.
   const wanted=new Set<string>(),collectionPath=`/api/caldav/${a.username}/${a.group}/`;
   for(const match of body.matchAll(/<(?:[\w-]+:)?href\b[^>]*>([^<]+)<\/(?:[\w-]+:)?href\s*>/gi)){
    const value=unxml(match[1].trim());let url:URL,resourceUID:string;
    try{url=new URL(value,request.url);resourceUID=decodeURIComponent(url.pathname.slice(collectionPath.length)).replace(/\.ics$/,'');}catch{return new Response('Invalid resource URL',{status:400,headers:baseHeaders});}
    if(url.origin!==new URL(request.url).origin||!url.pathname.startsWith(collectionPath)||!url.pathname.endsWith('.ics')||url.pathname.slice(collectionPath.length).includes('/')||url.search||url.hash){missingHrefs.push(value);continue;}
    if(wanted.has(resourceUID))continue;
    wanted.add(resourceUID);
    if(!a.resources.some((item:any)=>item.uid===resourceUID))missingHrefs.push(url.pathname);
   }
   items=items.filter((item:any)=>wanted.has(item.uid));
  }
  let tombs:any[]=[];if(/sync-collection/i.test(body)){const supplied=/<(?:[\w-]+:)?sync-token[^>]*>([^<]*)<\/(?:[\w-]+:)?sync-token>/i.exec(body)?.[1]||'',prefix=tokenPrefix(a);if(supplied&&!supplied.startsWith(prefix)&&(a.meta.syncEpoch||!/^rev-\d+$/.test(supplied)))return responseXML('<D:error xmlns:D="DAV:"><D:valid-sync-token/></D:error>',403);const revisionText=supplied.startsWith(prefix)?supplied.slice(prefix.length):/rev-(\d+)/.exec(supplied)?.[1]||'0',since=Number(revisionText);if(supplied&&(!/^\d+$/.test(revisionText)||!Number.isSafeInteger(since)||since>Number(a.calendar.revision)))return responseXML('<D:error xmlns:D="DAV:"><D:valid-sync-token/></D:error>',403);if(supplied&&since===Number(a.calendar.revision))items=[];tombs=supplied?a.tombstones.filter((item:any)=>item.rosterId===a.meta.rosterId&&Number(item.revision)>since):[];if(supplied&&since!==Number(a.calendar.revision))tombs.push(...a.hiddenResources);tombs=tombs.filter((item:any,index:number,list:any[])=>!a.resources.some((resource:any)=>resource.uid===item.uid)&&list.findIndex(x=>x.uid===item.uid)===index);}
  const entries=await Promise.all(items.map(async(item:any)=>`<D:response><D:href>${href(a.username,item.uid,a.group)}</D:href>${selectedPropstat(`<D:getetag>${await tag(item.ics)}</D:getetag><D:getcontenttype>text/calendar; charset=utf-8</D:getcontenttype><D:resourcetype/><C:calendar-data>${xmlEscape(item.ics)}</C:calendar-data>`,requested)}</D:response>`));
  for(const missing of new Set(missingHrefs))entries.push(`<D:response><D:href>${xmlEscape(missing)}</D:href><D:status>HTTP/1.1 404 Not Found</D:status></D:response>`);
  for(const item of tombs)entries.push(`<D:response><D:href>${href(a.username,item.uid,a.group)}</D:href><D:status>HTTP/1.1 404 Not Found</D:status></D:response>`);
  console.info('caldav-report',JSON.stringify({type:/sync-collection/i.test(body)?'sync':/calendar-multiget/i.test(body)?'multiget':'query',resources:a.resources.length,returned:items.length,deleted:tombs.length,properties:requested?.map(x=>x.name)||['all']}));
  return responseXML(`<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">${entries.join('')}${/sync-collection/i.test(body)?`<D:sync-token>${syncToken(a)}</D:sync-token>`:''}</D:multistatus>`);
 }
 const uid=decodeURIComponent(path[path.length-1]||'').replace(/\.ics$/,'');
 if(method==='GET'||method==='HEAD'){const item=a.resources.find((x:any)=>x.uid===uid);if(!item)return new Response('Not found',{status:404,headers:baseHeaders});return new Response(method==='HEAD'?null:item.ics,{headers:{...baseHeaders,'Content-Type':'text/calendar; charset=utf-8','ETag':await tag(item.ics)}});}
 if(method==='PUT'){
  let body=await request.text();if(body.length>128000)return new Response('Event too large',{status:413,headers:baseHeaders});const exists=a.resources.find((x:any)=>x.uid===uid),ifMatch=request.headers.get('if-match');if(ifMatch&&(!exists||ifMatch!=='*'&&ifMatch!==await tag(exists.ics)))return new Response('Precondition failed',{status:412,headers:baseHeaders});if(request.headers.get('if-none-match')==='*'&&exists)return new Response('Already exists',{status:412,headers:baseHeaders});
  if(!getFields(body).CATEGORIES&&['overtime','leave'].includes(a.group))body=body.replace(/BEGIN:VEVENT\r?\n/,`BEGIN:VEVENT\r\nCATEGORIES:${a.group.toUpperCase()}\r\n`);
  if(!exists&&a.allResources.some((item:any)=>item.uid===uid))return new Response('This event belongs to another Shiftly calendar; change its type in Shiftly.',{status:409,headers:baseHeaders});
  try{if(getFields(body).UID?.value!==uid)return new Response('UID does not match resource',{status:400,headers:baseHeaders});const saved=await writeEvent(a,body),fresh:any=await getAccount(new Request(request.url,{method:'GET',headers:request.headers})),resource=fresh?.allResources?.find((x:any)=>x.uid===saved);return new Response(null,{status:exists?204:201,headers:{...baseHeaders,...(resource?{'ETag':await tag(resource.ics)}:{}),'Location':href(a.username,saved,resource&&a.options.groupByType?resourceGroup(resource,a.calendar.timezone):'calendar')}});}catch(error:any){return new Response(error?.message==='CONFLICT'?'Precondition failed':'Invalid calendar event',{status:error?.message==='CONFLICT'?412:400,headers:baseHeaders});}
 }
 if(method==='DELETE'){const item=a.resources.find((x:any)=>x.uid===uid);if(!item)return new Response(null,{status:404,headers:baseHeaders});const ifMatch=request.headers.get('if-match');if(ifMatch&&ifMatch!=='*'&&ifMatch!==await tag(item.ics))return new Response('Precondition failed',{status:412,headers:baseHeaders});try{await writeEvent(a,item.ics,true);return new Response(null,{status:204,headers:baseHeaders});}catch{return new Response('Could not update Shiftly',{status:409,headers:baseHeaders});}}
 return new Response('Method not allowed',{status:405,headers:{...baseHeaders,'Allow':allow}});
}

