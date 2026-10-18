import {env} from 'cloudflare:workers';
import {context,access,failure} from '../../../../lib/server';
import {readMutation} from '../../../../lib/security';
import {addDays,calendarDate,Snapshot} from '../../../../lib/engine';
import {calendarICS} from '../../../../lib/ics';
import {calendarRosters,rosterSnapshot} from '../../../../lib/rosters';

const noStore={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Type':'text/calendar; charset=utf-8'};
const json=(data:any,status=200)=>Response.json(data,{status,headers:{...noStore,'Content-Type':'application/json; charset=utf-8'}});
const hex=(bytes:Uint8Array)=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
async function digest(token:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));}
function newToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function validRosterId(value:unknown):value is string{return typeof value==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(value);}

export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new Error('FORBIDDEN');
 const {db,user}=await context(),body=await readMutation(request),calendar=await access(db,user,String(body.calendarId||''));
 if(calendar.role!=='owner')throw new Error('FORBIDDEN');
 if(!['status','create','configure','revoke'].includes(body.action)||!validRosterId(body.rosterId))throw new Error('Invalid calendar subscription request');
 const rows=(await db.prepare("SELECT id,data FROM calendar_records WHERE calendar_id=? AND kind='roster'").bind(calendar.id).all()).results as any[];
 const roster=calendarRosters({rosters:rows.map(row=>JSON.parse(String(row.data)))}).find((item:any)=>item.id===body.rosterId);
 if(!roster||roster.archived)throw new Error('Choose a valid roster');
 const feeds=(await db.prepare("SELECT id,data FROM calendar_records WHERE calendar_id=? AND kind='calendar_feed'").bind(calendar.id).all()).results as any[];
 const existing=feeds.find((row:any)=>JSON.parse(String(row.data)).rosterId===body.rosterId);
 if(body.action==='status')return json({connected:!!existing,includeOff:existing?JSON.parse(String(existing.data)).includeOff!==false:true});
 if(body.action==='configure'){
  if(!existing)throw new Error('Create the calendar subscription before changing its options');
  const metadata=JSON.parse(String(existing.data)),includeOff=body.includeOff!==false;
  await db.prepare("UPDATE calendar_records SET data=? WHERE calendar_id=? AND id=? AND kind='calendar_feed'").bind(JSON.stringify({...metadata,includeOff}),calendar.id,existing.id).run();
  return json({connected:true,includeOff});
 }
 if(body.action==='revoke'){
  if(existing)await db.prepare("DELETE FROM calendar_records WHERE calendar_id=? AND id=? AND kind='calendar_feed'").bind(calendar.id,existing.id).run();
  return json({connected:false});
 }
 const token=newToken(),tokenHash=await digest(token),id='feed_'+tokenHash;
 const statements:any[]=[];
 if(existing)statements.push(db.prepare("DELETE FROM calendar_records WHERE calendar_id=? AND id=? AND kind='calendar_feed'").bind(calendar.id,existing.id));
 statements.push(db.prepare('INSERT INTO calendar_records(id,calendar_id,kind,date,author,private,data) VALUES(?,?,?,NULL,?,1,?)').bind(id,calendar.id,'calendar_feed',user.userId,JSON.stringify({tokenHash,rosterId:body.rosterId,includeOff:body.includeOff!==false})));
 await db.batch(statements);
 const url=new URL('/api/calendar/feed?token='+encodeURIComponent(token),request.url);
 return json({connected:true,includeOff:body.includeOff!==false,url:url.toString(),webcal:url.toString().replace(/^https?:/,'webcal:')});
 }catch(error){return failure(error);}}

export async function GET(request:Request){try{
 if(!env.DB)return new Response('Calendar feed unavailable',{status:503,headers:noStore});
 const token=new URL(request.url).searchParams.get('token')||'';
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return new Response('Calendar subscription not found',{status:404,headers:noStore});
 const tokenHash=await digest(token),id='feed_'+tokenHash;
 const feed:any=await env.DB.prepare("SELECT calendar_id,author,data FROM calendar_records WHERE id=? AND kind='calendar_feed' AND private=1").bind(id).first();
 if(!feed)return new Response('Calendar subscription not found',{status:404,headers:noStore});
 const metadata=JSON.parse(String(feed.data));
 if(metadata.tokenHash!==tokenHash||!validRosterId(metadata.rosterId))return new Response('Calendar subscription not found',{status:404,headers:noStore});
 const calendar:any=await env.DB.prepare('SELECT id,owner,name,timezone,settings,revision FROM calendars WHERE id=? AND owner=?').bind(feed.calendar_id,feed.author).first();
 if(!calendar)return new Response('Calendar subscription not found',{status:404,headers:noStore});
 const rows=(await env.DB.prepare("SELECT kind,data FROM calendar_records WHERE calendar_id=? AND kind IN ('roster','shift','pattern','occurrence','event') AND (private=0 OR author=?) ORDER BY rowid").bind(calendar.id,calendar.owner).all()).results as any[];
 const raw:any={calendar:{...calendar,settings:JSON.parse(String(calendar.settings))},role:'owner',rosters:[],shifts:[],patterns:[],occurrences:[],events:[],members:[],invites:[],audit:[]};
 for(const row of rows){const key=({roster:'rosters',shift:'shifts',pattern:'patterns',occurrence:'occurrences',event:'events'} as Record<string,string>)[String(row.kind)];if(key)raw[key].push(JSON.parse(String(row.data)));}
 const roster=calendarRosters(raw).find((item:any)=>item.id===metadata.rosterId);
 if(!roster||roster.archived)return new Response('Calendar subscription not found',{status:404,headers:noStore});
 const snapshot=rosterSnapshot(raw,metadata.rosterId) as Snapshot;
 const today=calendarDate(Date.now(),calendar.timezone),start=addDays(today,-365),end=addDays(today,1095);
 const body=calendarICS(snapshot,start,end,false,{sequence:Number(calendar.revision)||0,calendarName:`${calendar.name} · ${roster.name}`,includeOff:metadata.includeOff!==false});
 return new Response(body,{headers:{...noStore,'Content-Disposition':'inline; filename="shiftly-roster.ics"','Vary':'Accept-Encoding'}});
 }catch(error){return failure(error);}}
