import type {CSSProperties} from 'react';
import {addDays,resolveShift,eventsOn} from '../../lib/engine';
import {cellColours} from '../../lib/cell-colours';
import {fmt} from './primitives';
export default function UpcomingRoster({s,today,onOpen}:any){
 return <section className="upcoming-roster" aria-label="Next seven days"><div className="section-row"><h3>Your week</h3><small>Next 7 days</small></div><div className="week-glance">{Array.from({length:7},(_,i)=>{const date=addDays(today,i),shift=resolveShift(s,date),entries=eventsOn(s.events,date);return <button type="button" key={date} aria-label={fmt(date,{weekday:'long',day:'numeric',month:'long'})+', '+(shift?.name||'No duty')+(entries.length?', '+entries.length+' entries':'')} onClick={()=>onOpen(date)}><span>{i===0?'Today':fmt(date,{weekday:'short'})}</span><div className={'glance-duty '+(shift?'duty-coloured':'')} style={shift?cellColours(shift) as CSSProperties:undefined}><small>{Number(date.slice(8))}</small><strong>{shift?.short||'·'}</strong>{entries.length>0&&<i aria-hidden="true"/>}</div></button>;})}</div></section>;
}
