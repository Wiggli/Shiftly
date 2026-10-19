'use client';
import {useEffect,useRef,useState} from 'react';
import type {Event,Shift} from '../../lib/engine';
import {dutyTimeChoices} from '../../lib/quick-entries';
import {Field,fmt} from './primitives';

export default function QuickEntryForm({value,shifts,writable,onChange,onSave,onCancel,onMore}:{value:Event;shifts:Shift[];writable:boolean;onChange:(event:Event)=>void;onSave:(event:Event)=>Promise<boolean>;onCancel:()=>void;onMore:()=>void}){
 const formRef=useRef<HTMLFormElement>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>formRef.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));return()=>cancelAnimationFrame(frame);},[value.id]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const note=value.title==='Daily note',overtime=value.entryType==='overtime',leave=value.entryType==='leave';
 function update(change:Partial<Event>){onChange({...value,...change});}
 return <form ref={formRef} className="quick-entry-form" aria-label={note?'Add note':overtime?'Add overtime':'Add leave'} onSubmit={async event=>{event.preventDefault();if(busy||!writable)return;setBusy(true);setError('');try{if(!await onSave(value))setError('Not saved yet. Your entry is still here.');}catch{setError('Not saved yet. Please try again.');}finally{setBusy(false);}}}>
  <div className="quick-form-heading"><strong>{note?'Note':overtime?'Overtime':'Leave'}</strong><span>{fmt(value.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span></div>
  <fieldset className="shift-editor-fields" disabled={busy||!writable}>
   {overtime&&<><div className="quick-time-presets">{dutyTimeChoices(shifts).slice(0,4).map(shift=><button key={shift.id} type="button" aria-pressed={value.time===shift.start&&value.endTime===shift.end} onClick={()=>update({time:shift.start,endTime:shift.end})}><strong>{shift.name}</strong><small>{shift.start}–{shift.end}</small></button>)}</div><div className="two-col"><Field label="From"><input type="time" value={value.time} onChange={e=>update({time:e.target.value,endTime:e.target.value?value.endTime:undefined})}/></Field><Field label="To"><input type="time" disabled={!value.time} value={value.endTime||''} onChange={e=>update({endTime:e.target.value||undefined})}/></Field></div></>}
   {overtime&&value.time&&value.endTime&&value.endTime<=value.time&&<p className="hint">Ends the next day.</p>}
   {leave&&<div className="quick-leave-presets">{[['Leave','Leave'],['Annual','Annual leave'],['Study','Study leave'],['Sick','Sick leave']].map(([label,title])=><button type="button" key={title} aria-pressed={value.title===title} onClick={()=>update({title})}>{label}</button>)}</div>}
   <Field label={note?'Note':'Note, optional'}><textarea required={note} rows={note?3:2} value={value.notes} onChange={e=>update({notes:e.target.value})} placeholder={note?'Write your note…':'Anything to remember…'}/></Field>
   <p className="quick-privacy">Only you can see this entry.</p><button type="button" className="text-button" onClick={onMore}>More options</button>
  </fieldset>
  {error&&<p className="danger" role="alert">{error}</p>}
  <div className="quick-form-actions"><button type="button" className="quiet-button" disabled={busy} onClick={onCancel}>Cancel</button><button className="primary" disabled={busy||!writable}>{busy?'Saving…':'Save'}</button></div>
 </form>;
}
