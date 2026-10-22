import {env} from '../standalone/server/runtime';
import {getAppUser} from './auth';
import {ownerName} from './schedule-identity';
import {calendarRosters} from './rosters';
import {defaults} from './engine';
export async function context(){const user=await getAppUser();if(!user)throw new Error('UNAUTHENTICATED');if(!env.DB)throw new Error('DATABASE_UNAVAILABLE');const name=ownerName(user.fullName);if(name)await env.DB.prepare("UPDATE calendars SET owner_name=?,revision=revision+1 WHERE owner=? AND coalesce(owner_name,'')<>?").bind(name,user.userId,name).run();return {db:env.DB,user};}
export async function access(db:any,user:any,id:string){const c=await db.prepare('SELECT * FROM calendars WHERE id=?').bind(id).first();if(!c)throw new Error('NOT_FOUND');const member=await db.prepare('SELECT role,roster_id FROM calendar_members WHERE calendar_id=? AND user=?').bind(id,user.userId).first();const role=c.owner===user.userId?'owner':member?.role;if(!role)throw new Error('FORBIDDEN');const rosterScope=c.owner===user.userId?null:member?.roster_id||null;if(rosterScope){const row=await db.prepare("SELECT data FROM calendar_records WHERE calendar_id=? AND kind='roster' AND json_extract(data,'$.id')=?").bind(id,rosterScope).first();if((!row&&rosterScope!=='main')||(row&&JSON.parse(row.data).archived))throw new Error('FORBIDDEN');}return {...c,settings:JSON.parse(c.settings),role,rosterScope};}
export function failure(error:any){
 const raw=typeof error?.message==='string'?error.message:'';
 const codes:Record<string,number>={UNAUTHENTICATED:401,FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409};
 const expected=/^(Invalid |Check the record fields: |Enter a calendar name$|Expected a JSON request$|Request too large$|Unknown action$|Invitation |This roster |Choose a valid roster$|Member no longer |Check the email |Create a new shift type |Record ID |The primary roster |Keep at least one roster|This entry belongs |This pattern uses |This date uses |This shift type belongs |This event contains )/;
 const known=!!codes[raw]||expected.test(raw)||error?.name==='ZodError';
 const message=error?.name==='ZodError'?'Check the record fields':known?raw:'The request could not be completed. Please try again.';
 if(!known)console.warn('Shiftly request failed', {code:raw==='DATABASE_UNAVAILABLE'?'database_unavailable':'internal_error'});
 const labels:Record<string,string>={UNAUTHENTICATED:'Sign in again to open your schedules.',FORBIDDEN:'You do not have access to this schedule or permission to change it.',NOT_FOUND:'This schedule is no longer available.',CONFLICT:'This schedule changed elsewhere. Review your unsent edits before trying again.'};
 return Response.json({error:labels[raw]||message.replace(/\brosters\b/g,'schedules').replace(/\broster\b/g,'schedule')},{status:codes[raw]||(known?400:503),headers:{'Cache-Control':'private, no-store'}});
}
export async function initial(db:any,user:any){let c=await db.prepare('SELECT * FROM calendars WHERE owner=? ORDER BY rowid LIMIT 1').bind(user.userId).first();if(!c){const id='primary_'+user.userId;await db.batch([db.prepare('INSERT OR IGNORE INTO calendars(id,owner,name,timezone,owner_name) VALUES(?,?,?,?,?)').bind(id,user.userId,'My calendar','Europe/Malta',ownerName(user.fullName)||null),...defaults.map(s=>db.prepare('INSERT OR IGNORE INTO calendar_records(id,calendar_id,kind,author,data) VALUES(?,?,?,?,?)').bind(id+'_'+s.id,id,'shift',user.userId,JSON.stringify(s)))]);c=await db.prepare('SELECT * FROM calendars WHERE id=?').bind(id).first();}return c;}

export async function scheduleCatalog(db:any,user:any){
 const rows=(await db.prepare("SELECT c.id,c.name,c.owner,c.owner_name,c.revision,CASE WHEN c.owner=? THEN 'owner' ELSE m.role END AS role,m.roster_id FROM calendars c LEFT JOIN calendar_members m ON c.id=m.calendar_id AND m.user=? WHERE c.owner=? OR m.user=?").bind(user.userId,user.userId,user.userId,user.userId).all()).results;
 const catalog=[];
 for(const calendar of rows){
  const records=(await db.prepare("SELECT data FROM calendar_records WHERE calendar_id=? AND kind='roster' ORDER BY rowid").bind(calendar.id).all()).results;
  const scope=calendar.role==='owner'?null:calendar.roster_id||null;
  const rosters=calendarRosters({rosters:records.map((r:any)=>JSON.parse(r.data))}).filter(r=>!r.archived&&(!scope||r.id===scope));
  if(!rosters.length)continue;
  catalog.push({...calendar,rosterScope:scope,rosters});
 }
 return catalog;
}
