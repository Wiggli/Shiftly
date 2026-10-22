'use client';
import {Layers,CalendarDays} from 'lucide-react';
import type {Snapshot} from '../../lib/engine';

export default function RosterPatternStatus({snapshot,writable,onCreate,onUseDates}:{snapshot:Snapshot;writable:boolean;onCreate:()=>void;onUseDates:()=>void}){
 const known=new Set(snapshot.shifts.map(shift=>shift.id));
 const dates=new Set(snapshot.occurrences.filter(duty=>!duty.deleted&&known.has(duty.shiftId)).map(duty=>duty.date));
 if(snapshot.patterns.length)return null;
 return <article className="pattern-empty">
  {dates.size?<CalendarDays size={26}/>:<Layers size={26}/>}
  <h2>{dates.size?'Your shifts are on the calendar':'Set up your work schedule'}</h2>
  <p>{dates.size?`${dates.size} shifts were added individually. You can keep adding days, or set up your usual schedule.`:'Choose how you normally work and Shiftly will fill the calendar for you.'}</p>
  {dates.size>0&&<p className="pattern-explanation">A repeating schedule fills your usual shifts automatically. Individual day changes stay in place.</p>}
  {writable&&<div className="pattern-status-actions">{dates.size>0&&<button className="quiet-button" onClick={onUseDates}>Use existing dates</button>}<button className={dates.size?'text-button':'quiet-button'} onClick={onCreate}>{dates.size?'Set up my schedule':'Set up my schedule'}</button></div>}
  {writable&&dates.size>0&&<small>Select one complete cycle, then choose Repeat in the editing tools.</small>}
 </article>;
}
