import {Snapshot,Event,addDays,eventsOn,resolveShift,zonedInstant,isDate} from './engine';
const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const unescape=(s:string)=>s.replace(/\\([nN,;\\])/g,(_,char)=>char.toLowerCase()==='n'?'\n':char);
const stamp=(n:number)=>new Date(n).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
export function foldCalendarLine(line:string){const encoder=new TextEncoder();const lines:string[]=[];let current='',bytes=0;for(const char of line){const n=encoder.encode(char).length;if(bytes+n>73){lines.push(current);current=' ';bytes=1;}current+=char;bytes+=n;}lines.push(current);return lines.join('\r\n');}
export function calendarICS(s:Snapshot,start:string,end:string,notes=false,options:{sequence?:number;calendarName?:string;includeOff?:boolean}={}){if(!isDate(start)||!isDate(end)||start>end||Date.parse(end)-Date.parse(start)>3660*86400000)throw new Error('Choose a range of up to 10 years');const sequence=Math.max(0,Math.floor(options.sequence||0)),lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Shiftly//Roster//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','REFRESH-INTERVAL;VALUE=DURATION:PT6H','X-PUBLISHED-TTL:PT6H',...(options.calendarName?[`X-WR-CALNAME:${escape(options.calendarName)}`]:[])];for(let d=start;d<=end;d=addDays(d,1)){const sh=resolveShift(s,d);if(sh&&(options.includeOff!==false||sh.category!=='Off')){lines.push('BEGIN:VEVENT',`UID:${s.calendar.id}${s.activeRosterId&&s.activeRosterId!=="main"?"-"+s.activeRosterId:""}-${d}-shift@shiftly`,`DTSTAMP:${stamp(Date.now())}`,`SEQUENCE:${sequence}`);if(sh.start&&sh.end){lines.push(`DTSTART:${stamp(zonedInstant(d,sh.start,s.calendar.timezone))}`,`DTEND:${stamp(zonedInstant(addDays(d,sh.durationDays??(sh.end<=sh.start?1:0)),sh.end,s.calendar.timezone))}`);}else{lines.push(`DTSTART;VALUE=DATE:${d.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${addDays(d,1).replace(/-/g,'')}`);}lines.push(`SUMMARY:${escape(sh.name)}`,`CATEGORIES:${escape(sh.category)}`,`LOCATION:${escape(sh.location||'')}`,'END:VEVENT');}for(const e of eventsOn(s.events,d)){const kind=e.entryType||legacyEntryType(e);lines.push('BEGIN:VEVENT',`UID:${s.calendar.id}${s.activeRosterId&&s.activeRosterId!=="main"?"-"+s.activeRosterId:""}-${e.id}-${d}@shiftly`,`DTSTAMP:${stamp(Date.now())}`,`SEQUENCE:${sequence}`,e.time?`DTSTART:${stamp(zonedInstant(d,e.time,s.calendar.timezone))}`:`DTSTART;VALUE=DATE:${d.replace(/-/g,'')}`,...(e.time&&e.endTime?[`DTEND:${stamp(zonedInstant(addDays(d,e.endTime<=e.time?1:0),e.endTime,s.calendar.timezone))}`]:[]),`SUMMARY:${escape(e.title)}`,`CATEGORIES:${kind.toUpperCase()}`,`LOCATION:${escape(e.location||'')}`,...(notes?[`DESCRIPTION:${escape(e.notes)}`]:[]),'END:VEVENT');}}lines.push('END:VCALENDAR');return lines.map(foldCalendarLine).join('\r\n');}
function legacyEntryType(e:Event):string{if(e.title==='Overtime'&&e.emoji==='⏱️')return'overtime';if(e.title==='Leave'&&e.emoji==='🌿')return'leave';if(e.title==='Appointment'&&e.emoji==='🏥')return'appointment';return'custom';}
function hash(text:string){let n=2166136261;for(const ch of text){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16);}
type CalendarField={value:string;params:string};
const calendarFormatters=new Map<string,Intl.DateTimeFormat>();
function calendarFormatter(timezone:string){
 let formatter=calendarFormatters.get(timezone);
 if(!formatter){formatter=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});if(calendarFormatters.size>=32)calendarFormatters.delete(calendarFormatters.keys().next().value!);calendarFormatters.set(timezone,formatter);}
 return formatter;
}
export function parseCalendarDate(field:CalendarField,timezone:string){
 const value=field.value;
 if(!/^\d{8}(T\d{6}Z?)?$/.test(value))throw new Error('Unsupported calendar date');
 let date=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`,time=value.includes('T')?`${value.slice(9,11)}:${value.slice(11,13)}`:'';
 if(!isDate(date)||time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||value.includes('T')&&Number(value.slice(13,15))>59)throw new Error('Invalid calendar date or time');
 if(!time)return {date,time};
 const zone=/(?:^|;)TZID=("[^"]+"|[^;:]+)/i.exec(field.params)?.[1]?.replace(/^"|"$/g,'');
 if(value.endsWith('Z')||zone){
  const instant=value.endsWith('Z')?new Date(`${date}T${time}:${value.slice(13,15)}Z`).getTime():zonedInstant(date,time,zone!);
  const parts=Object.fromEntries(calendarFormatter(timezone).formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
  date=`${parts.year}-${parts.month}-${parts.day}`;time=`${parts.hour}:${parts.minute}`;
 }
 return {date,time};
}
export function importICS(text:string,timezone:string,existing:Event[]=[]):Event[]{
 if(text.length>2000000)throw new Error('Use an ICS file smaller than 2 MB');
 const unfolded=text.replace(/\r?\n[ \t]/g,'');
 if(!unfolded.includes('BEGIN:VCALENDAR')||!unfolded.includes('END:VCALENDAR'))throw new Error('Not a valid calendar file');
 const records=unfolded.split('BEGIN:VEVENT').slice(1);
 if(records.length>1000)throw new Error('Import up to 1000 events at a time');
 const imported=new Map<string,Event>();
 for(const record of records){
  if(!record.includes('END:VEVENT'))throw new Error('Incomplete calendar event');
  const raw=record.split('END:VEVENT')[0],fields:Record<string,CalendarField>={};
  for(const line of raw.split(/\r?\n/)){const colon=line.indexOf(':');if(colon<0)continue;const full=line.slice(0,colon);fields[full.split(';')[0].toUpperCase()]={value:line.slice(colon+1),params:full};}
  if(!fields.DTSTART)throw new Error('Unsupported DTSTART');
  if(['RECURRENCE-ID','RDATE','EXDATE','DURATION'].some(key=>fields[key]))throw new Error('Unsupported calendar exceptions or duration; export individual events with start and end dates');
  if(fields.STATUS?.value.toUpperCase()==='CANCELLED')throw new Error('Cancelled events cannot be imported; remove them from the file first');
  const {date,time}=parseCalendarDate(fields.DTSTART,timezone);let endTime:string|undefined;
  if(fields.DTEND){
   const end=parseCalendarDate(fields.DTEND,timezone);
   if(time){if(!end.time||end.time===time||end.date!==addDays(date,end.time<time?1:0))throw new Error('Import one date or one overnight span per event');endTime=end.time;}
   else if(end.time||end.date!==addDays(date,1))throw new Error('Multi-day entries are not supported; export individual dates');
  }
  const rule=fields.RRULE?.value;let recurrence='none',until:string|undefined;
  if(rule){
   const parts=rule.toUpperCase().split(';'),values=Object.fromEntries(parts.map(part=>part.split('=')));
   if(!['DAILY','WEEKLY','MONTHLY','YEARLY'].includes(values.FREQ)||parts.some(part=>!['FREQ','INTERVAL','UNTIL','WKST'].includes(part.split('=')[0]))||values.INTERVAL&&values.INTERVAL!=='1')throw new Error('Complex recurrence is not supported in this import; export individual occurrences first');
   recurrence=values.FREQ.toLowerCase();
   if(values.UNTIL){until=parseCalendarDate({value:values.UNTIL,params:fields.DTSTART.params},timezone).date;if(until<date)throw new Error('Recurrence ends before its start');}
  }
  const sourceUID=fields.UID?.value;if(sourceUID&&sourceUID.length>512)throw new Error('Calendar UID is too long');
  const legacy='ics-'+hash((sourceUID||record)+fields.DTSTART.value);
  const previous=existing.find(event=>sourceUID&&event.sourceUID===sourceUID)||existing.find(event=>event.id===legacy||event.id.endsWith(':'+legacy));
  const id=previous?.id||(sourceUID?'ics-uid-'+hash(sourceUID):legacy);
  if([...existing,...imported.values()].some(event=>event.id===id&&event.sourceUID&&event.sourceUID!==sourceUID))throw new Error('Conflicting imported event identifiers; import this file separately');
  const category=fields.CATEGORIES?.value.toLowerCase(),entryType=['overtime','leave','appointment'].includes(category||'')?category as Event['entryType']:previous?.entryType;
  imported.set(sourceUID||id,{...previous,id,date,time,endTime,title:unescape(fields.SUMMARY?.value||'Imported event').slice(0,120),emoji:previous?.emoji||'📅',notes:unescape(fields.DESCRIPTION?.value||''),private:previous?.private??true,notesPrivate:previous?.notesPrivate??true,location:unescape(fields.LOCATION?.value||''),recurrence,until,reminders:previous?.reminders||[],...(sourceUID?{sourceUID}:{}),...(entryType?{entryType}:{})});
 }
 return [...imported.values()];
}
