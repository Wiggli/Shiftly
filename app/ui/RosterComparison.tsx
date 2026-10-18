'use client';
import React from 'react';
import {Heart} from 'lucide-react';
import {resolveShift,isWorking,eventsOn} from '../../lib/engine';
import {rosterSnapshot,Roster} from '../../lib/rosters';
import {ShiftChip,fmt} from './primitives';
export default function RosterComparison({snapshot,rosters,dates,onOpen}:any){
 const schedules=rosters.map((r:Roster)=>({roster:r,snapshot:rosterSnapshot(snapshot,r.id)}));
 return <div className="roster-comparison"><div className="together-heading"><Heart size={20}/><div><h3>Time together</h3><p>Compare {rosters.map((r:Roster)=>r.name).join(', ')}.</p></div></div>{dates.map((date:string)=>{const shifts=schedules.map((r:any)=>resolveShift(r.snapshot,date));const bothOff=shifts.every((s:any)=>s?.category==='Off');const working=shifts.every((s:any)=>s&&isWorking(s));return <article className="comparison-day" key={date}><div className="comparison-date"><strong>{fmt(date,{weekday:'short',day:'numeric',month:'short'})}</strong>{bothOff?<span className="free-together">{rosters.length===2?'Both off':'All off'}</span>:working?<small>{new Set(shifts.map((s:any)=>s.start+'-'+s.end)).size===1?'Working the same hours':'Different working hours'}</small>:<small>{shifts.some((s:any)=>!s)?'Some shifts unplanned':'Different schedules'}</small>}</div><div className="comparison-people">{schedules.map((r:any,i:number)=>{const events=eventsOn(r.snapshot.events,date);return <button key={r.roster.id} onClick={()=>onOpen(r.roster.id,date)} className="comparison-person"><span className="comparison-name"><i style={{background:r.roster.color}}/>{r.roster.name}</span>{shifts[i]?<ShiftChip shift={shifts[i]} compact/>:<span className="muted">Unplanned</span>}<small>{shifts[i]?.start&&shifts[i].start+'–'+shifts[i].end}{events.length>0&&' '+events.slice(0,3).map((e:any)=>e.emoji).join(' ')}</small></button>;})}</div></article>;})}</div>;
}
