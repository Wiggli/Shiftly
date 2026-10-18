import type {Event} from '../../lib/engine';

// Events supplied here already belong to the active roster and are filtered
// by the account's access. Never fetch or join private notes in the cell.
export default function CellEntries({events,iconsOnly=false}:{events:Event[];iconsOnly?:boolean}){
 if(!events.length)return null;
 if(iconsOnly)return <div className="cell-events">{events.slice(0,3).map(event=><span key={event.id} title={event.title}>{event.emoji||'📝'}</span>)}{events.length>3&&<small>+{events.length-3}</small>}</div>;
 return <div className="cell-entries">{events.slice(0,2).map(event=>{
  const compactTitle=event.entryType==='overtime'||/^Overtime(?:\s+(?:day|night))?$/i.test(event.title)?event.title.replace(/^Overtime(?=\s|$)/i,'OT'):event.title;
  const label=event.cellLabel?.trim()|| (event.entryType==='leave'&&event.title==='Annual leave'?'Leave':event.entryType==='overtime'&&event.title==='Overtime'?'OT':'')|| (event.title==='Daily note'&&event.notes?.trim()?event.notes.trim():compactTitle);
  return <div className={'cell-entry'+(event.entryType==='leave'?' cell-entry-leave':'')} key={event.id} title={[event.time,event.title==='Daily note'?label:event.title].filter(Boolean).join(' ')}><span className="cell-entry-text">{event.time&&<b className="cell-entry-time">{event.time}</b>}{label}</span></div>;
 })}{events.length>2&&<small className="cell-entry-more">+{events.length-2} more</small>}</div>;
}
