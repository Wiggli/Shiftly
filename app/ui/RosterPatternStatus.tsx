'use client';
import {Layers,CalendarDays} from 'lucide-react';
import type {Snapshot} from '../../lib/engine';

export default function RosterPatternStatus({snapshot,writable,onCreate,onUseDates}:{snapshot:Snapshot;writable:boolean;onCreate:()=>void;onUseDates:()=>void}){
 const known=new Set(snapshot.shifts.map(shift=>shift.id));
 const dates=new Set(snapshot.occurrences.filter(duty=>!duty.deleted&&known.has(duty.shiftId)).map(duty=>duty.date));
 if(snapshot.patterns.length)return null;
 return <article className="pattern-empty">
  {dates.size?<CalendarDays size={26}/>:<Layers size={26}/>}
  <h2>{dates.size?'Your roster is already planned':'Start a repeating rotation'}</h2>
  <p>{dates.size?`${dates.size} duties are saved by date. There is no linked repeating rotation to edit here.`:'Choose a rotation to fill future dates, then adjust individual days as needed.'}</p>
  {dates.size>0&&<p className="pattern-explanation">The name above identifies your roster. A rotation is the sequence of duties used to plan ahead.</p>}
  {writable&&<div className="pattern-status-actions">{dates.size>0&&<button className="quiet-button" onClick={onUseDates}>Use existing dates</button>}<button className={dates.size?'text-button':'quiet-button'} onClick={onCreate}>{dates.size?'Create a new rotation':'Choose a rotation'}</button></div>}
  {writable&&dates.size>0&&<small>Select one complete cycle, then choose Repeat in the editing tools.</small>}
 </article>;
}
