import type {Pattern,Snapshot} from '../../lib/engine';
import {patternTimeline} from '../../lib/pattern-timeline';
import {ShiftChip,fmt} from './primitives';

export default function PatternCard({pattern,snapshot,date,writable,onEdit,onDuplicate,onRemove}:{pattern:Pattern;snapshot:Snapshot;date:string;writable:boolean;onEdit:()=>void;onDuplicate:()=>void;onRemove:()=>void}){
 const timeline=patternTimeline(pattern,date,snapshot.patterns);
 const status={active:'Active today',upcoming:'Upcoming',ended:'Finished',covered:'Another rotation applies today'}[timeline.state];
 return <article className="pattern-card">
  <div className="section-row"><h3>{pattern.name}</h3><button className="text-button" aria-label={writable?'Edit pattern':'View pattern'} onClick={onEdit}>{writable?'Edit':'View'}</button></div>
  <span className={'pattern-state pattern-state-'+timeline.state}>{status}</span>
  <div className="pattern-sequence" aria-label="Repeating duty sequence">{pattern.items.map((id,i)=>{const shift=snapshot.shifts.find(x=>x.id===id);return shift?<ShiftChip key={i} shift={shift} compact/>:<span key={i} aria-label="Blank day">·</span>;})}</div>
  <p className="pattern-date-range">{pattern.items.length}-day cycle · {pattern.repeat===0?'Repeats continuously':`Repeats ×${pattern.repeat}`}<br/>Starts {fmt(pattern.start,{day:'numeric',month:'short',year:'numeric'})}{timeline.last&&<><br/>Ends {fmt(timeline.last,{day:'numeric',month:'short',year:'numeric'})}</>}</p>
  {timeline.state==='active'&&<p className="pattern-cycle-position">Day {timeline.cycleDay} of {pattern.items.length}{timeline.nextCycle&&<> · Next cycle {fmt(timeline.nextCycle,{day:'numeric',month:'short'})}</>}</p>}
  {writable&&<details className="disclosure pattern-extra"><summary>Pattern options</summary><p className="hint">Use Edit to change the sequence or set an end date. Your individual duty changes stay in place.</p><button className="text-button" onClick={onDuplicate}>Duplicate</button><button className="text-button danger" onClick={onRemove}>Remove pattern</button></details>}
 </article>;
}
