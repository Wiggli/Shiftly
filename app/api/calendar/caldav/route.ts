import {calendarDisplayOptions} from '../../../../lib/calendar-appearance';
import {context,access,failure} from '../../../../lib/server';
import {readMutation} from '../../../../lib/security';
import {calendarRosters} from '../../../../lib/rosters';

const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(value:any,status=200)=>Response.json(value,{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
function password(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function validRoster(value:unknown):value is string{return typeof value==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(value);}

export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new Error('FORBIDDEN');
 const {db,user}=await context(),body=await readMutation(request),calendar=await access(db,user,String(body.calendarId||''));if(calendar.role!=='owner')throw new Error('FORBIDDEN');
 if(!validRoster(body.rosterId)||!['status','create','reset','revoke','configure'].includes(body.action))throw new Error('Invalid Apple Calendar account request');
 const rosterRows=(await db.prepare("SELECT data FROM calendar_records WHERE calendar_id=? AND kind='roster'").bind(calendar.id).all()).results as any[];
 const roster=calendarRosters({rosters:rosterRows.map(row=>JSON.parse(String(row.data)))}).find((row:any)=>row.id===body.rosterId&&!row.archived);if(!roster)throw new Error('Choose a valid roster');
 const rows=(await db.prepare("SELECT id,data FROM calendar_records WHERE calendar_id=? AND kind='calendar_caldav'").bind(calendar.id).all()).results as any[],existing=rows.find((row:any)=>JSON.parse(String(row.data)).rosterId===body.rosterId);
 const options=calendarDisplayOptions;
 const details=(username:string)=>({username,url:new URL(`/api/caldav/${username}/`,request.url).toString()});
 if(body.action==='status')return json(existing?{connected:true,...details(JSON.parse(String(existing.data)).username),...options(JSON.parse(String(existing.data)))}:{connected:false,...options(null)});
 if(body.action==='configure'){
  if(!existing)throw new Error('Create an Apple Calendar account first');
  if(typeof body.includeOff!=='boolean'||typeof body.compactTitles!=='boolean'||body.groupByType!==undefined&&typeof body.groupByType!=='boolean'||body.includeNotes!==undefined&&typeof body.includeNotes!=='boolean')throw new Error('Choose valid display options');
  const previous=options(JSON.parse(String(existing.data))),groupByType=body.groupByType??previous.groupByType,includeNotes=body.includeNotes??previous.includeNotes;
  await db.batch([db.prepare("UPDATE calendar_records SET data=json_set(data,'$.layoutVersion',2,'$.includeOff',json(?),'$.compactTitles',json(?),'$.groupByType',json(?),'$.includeNotes',json(?)) WHERE calendar_id=? AND id=? AND author=?").bind(JSON.stringify(body.includeOff),JSON.stringify(body.compactTitles),JSON.stringify(groupByType),JSON.stringify(includeNotes),calendar.id,existing.id,user.userId),db.prepare('UPDATE calendars SET revision=revision+1 WHERE id=?').bind(calendar.id)]);
  return json({connected:true,...details(JSON.parse(String(existing.data)).username),includeOff:body.includeOff,compactTitles:body.compactTitles,groupByType,includeNotes});
 }
 if(body.action==='revoke'){if(existing)await db.prepare("DELETE FROM calendar_records WHERE calendar_id=? AND id=? AND kind='calendar_caldav'").bind(calendar.id,existing.id).run();return json({connected:false});}
 if(body.action==='reset'){
  if(!existing)throw new Error('Create an Apple Calendar account first');
  const previous=JSON.parse(String(existing.data)),secret=password();
  await db.prepare("UPDATE calendar_records SET data=? WHERE calendar_id=? AND id=? AND kind='calendar_caldav' AND author=?").bind(JSON.stringify({...previous,passwordHash:await digest(secret)}),calendar.id,existing.id,user.userId).run();
  return json({connected:true,...details(previous.username),...options(previous),password:secret});
 }
 const username='s'+crypto.randomUUID().replaceAll('-','').slice(0,24),secret=password(),recordId='caldav_'+username;
 const batch:any[]=[];if(existing)batch.push(db.prepare("DELETE FROM calendar_records WHERE calendar_id=? AND id=? AND kind='calendar_caldav'").bind(calendar.id,existing.id));
 batch.push(db.prepare('INSERT INTO calendar_records(id,calendar_id,kind,date,author,private,data) VALUES(?,?,?,NULL,?,1,?)').bind(recordId,calendar.id,'calendar_caldav',user.userId,JSON.stringify({username,passwordHash:await digest(secret),rosterId:body.rosterId})));
 await db.batch(batch);
 return json({connected:true,username,password:secret,...options(null),url:new URL(`/api/caldav/${username}/`,request.url).toString()});
}catch(error){return failure(error);}}
