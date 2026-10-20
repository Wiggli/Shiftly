'use client';
import {Search,X} from 'lucide-react';
import {resolveShift,type Event,type Snapshot} from '../../lib/engine';
import {ShiftChip,fmt} from './primitives';

export default function CalendarSearch({snapshot,dates,month,value,onChange,onEvent,onDay}:{snapshot:Snapshot;dates:string[];month:string;value:string;onChange:(value:string)=>void;onEvent:(event:Event)=>void;onDay:(date:string)=>void}){
 const query=value.trim().toLocaleLowerCase();
 const events=query?snapshot.events.filter(event=>[event.title,event.notes,event.location].join(' ').toLocaleLowerCase().includes(query)):[];
 const duties=query?dates.filter(date=>date.slice(0,7)===month).map(date=>({date,shift:resolveShift(snapshot,date)})).filter(item=>item.shift&&[item.shift.name,item.shift.location,item.date].join(' ').toLocaleLowerCase().includes(query)):[];
 const count=events.length+duties.length;
 return <div className="calendar-search">
  <div className="search-input"><Search size={20} aria-hidden="true"/><input autoFocus aria-label="Search shifts, events, notes or locations" type="search" value={value} onChange={event=>onChange(event.target.value)} placeholder="Shift, event, note or location"/>{value&&<button type="button" className="icon-button" aria-label="Clear search" onClick={()=>onChange('')}><X size={18}/></button>}</div>
  <p className="search-status" role="status">{query?`${count} ${count===1?'result':'results'}`:'Search your calendar'}</p>
  {query&&count===0?<div className="search-empty"><Search size={28} aria-hidden="true"/><h3>No matches found</h3><p>Try a shift name, a word from a note or a location.</p></div>:<div className="search-results">{events.length>0&&<h3 className="menu-section-label">Events &amp; notes</h3>}{events.map(event=><button className="event-row" key={event.id} onClick={()=>onEvent(event)}><span aria-hidden="true">{event.emoji}</span><div><strong>{event.title==='Daily note'?'Note':event.title}</strong><small>{fmt(event.date,{day:'numeric',month:'short',year:'numeric'})}{event.time?' · '+event.time:''}</small>{event.notes&&<p className="search-result-note">{event.notes}</p>}</div></button>)}{duties.length>0&&<h3 className="menu-section-label">Shifts this month</h3>}{duties.map(item=><button className="event-row" key={item.date} onClick={()=>onDay(item.date)}><ShiftChip shift={item.shift}/><div><strong>{fmt(item.date,{weekday:'short',day:'numeric',month:'short'})}</strong><small>{item.shift?.start?item.shift.start+'–'+item.shift.end:'All day'}</small></div></button>)}</div>}
  <p className="hint search-scope">Shifts are searched in the displayed month. Events and notes are searched across your calendar.</p>
 </div>;
}
