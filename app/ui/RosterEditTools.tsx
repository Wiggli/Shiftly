'use client';
import React,{useState,useEffect} from 'react';
import {Paintbrush,CheckSquare,Copy,Scissors,ClipboardPaste,Repeat2,Trash2,Undo2,Redo2,Plus,Layers,Check} from 'lucide-react';
import {Shift,addDays,dayNumber} from '../../lib/engine';
import {dateRange,RosterBlock} from '../../lib/roster-edit';
import {ShiftChip,fmt} from './primitives';

export default function RosterEditTools({paint,setPaint,multi,setMulti,dates,setDates,shifts,month,selected,onTarget,onAssign,onCopy,onPaste,onRepeat,onRepeatCopy,onNewPattern,onSavedPatterns,clipboard,onDone,onUndo,onRedo,status}:any){
 const [from,setFrom]=useState(selected),[to,setTo]=useState(selected),[error,setError]=useState('');
 const block=clipboard as RosterBlock|undefined,mode=paint?'paint':multi?'select':'paste';
 const first=month+'-01',next=new Date(first+'T12:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);next.setUTCDate(0);const last=next.toISOString().slice(0,10),monthDates=dateRange(first,last);
 useEffect(()=>{if(dates.length)return;const initial=selected.slice(0,7)===month?selected:first;setFrom(initial);setTo(initial);setError('');},[month]);
 function range(a:string,b:string){try{setDates(dateRange(a,b));setError('');}catch(cause:any){setError(cause.message);}}
 function chooseMode(value:string){setPaint(value==='paint'?(shifts.find((s:Shift)=>s.category==='Work')?.id||shifts[0]?.id||'__erase__'):'');setMulti(value==='select');setDates([]);setError('');}
 return <section className="roster-edit-tools edit-workspace" aria-label="Roster edit mode">
  <div className="edit-workspace-heading"><div><span className="eyebrow">Roster editor</span><h2>Edit mode</h2></div><button className="primary" onClick={onDone}><Check size={17}/>Done</button></div>
  <p className="edit-save-status" role="status">{status} · Changes save as you edit.</p>
  <div className="segmented edit-mode-tabs" aria-label="Editing tool">
   <button aria-pressed={mode==='select'} className={mode==='select'?'active':''} onClick={()=>chooseMode('select')}><CheckSquare size={17}/>Select</button>
   <button aria-pressed={mode==='paint'} className={mode==='paint'?'active':''} onClick={()=>chooseMode('paint')}><Paintbrush size={17}/>Paint</button>
   <button disabled={!block} aria-pressed={mode==='paste'} className={mode==='paste'?'active':''} onClick={()=>chooseMode('paste')}><ClipboardPaste size={17}/>Paste</button>
  </div>
  {mode==='paint'?<><p className="hint">Choose a duty, then tap or drag across dates. Leave adds an annotation while keeping the duty.</p><div className="paint-palette">{shifts.map((shift:Shift)=><button aria-pressed={paint===shift.id} aria-label={'Paint '+shift.name} className={paint===shift.id?'active':''} key={shift.id} onClick={()=>setPaint(shift.id)}><ShiftChip shift={shift} compact/></button>)}<button className={'quiet-button '+(paint==='__erase__'?'active':'')} aria-pressed={paint==='__erase__'} onClick={()=>setPaint('__erase__')}><Trash2 size={17}/>Erase duty</button></div></>:mode==='select'?<>
   <p className="hint">Tap dates to select the duties you want to copy, move or repeat, including Rest and Off.</p>
   <div className="edit-selection-status"><strong>{dates.length} dates selected</strong><button className="text-button" disabled={!dates.length} onClick={()=>setDates([])}>Clear selection</button></div>
   <div className="edit-primary-actions"><button className="quiet-button" disabled={!dates.length} onClick={()=>onCopy(false)}><Copy size={18}/>Copy duties</button><button className="quiet-button" disabled={!dates.length} onClick={onRepeat}><Repeat2 size={18}/>Repeat selection</button></div>
   <details className="disclosure"><summary>Selection options · range, move &amp; clear</summary><h3 className="small">Select a date range</h3><div className="selection-range"><label>From<input aria-label="Selection start" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input aria-label="Selection end" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="quiet-button" onClick={()=>range(from,to)}>Select range</button></div><div className="selection-shortcuts"><button onClick={()=>range(first,last)}>Whole month</button><button onClick={()=>setDates(monthDates.filter((d:string)=>[0,6].includes(new Date(d+'T12:00:00Z').getUTCDay())))}>Weekends</button><button onClick={()=>setDates(monthDates.filter((d:string)=>![0,6].includes(new Date(d+'T12:00:00Z').getUTCDay())))}>Weekdays</button></div><h3 className="small">Change, move or clear selected duties</h3><div className="bulk-actions"><select aria-label="Apply duty to selected dates" disabled={!dates.length} value="" onChange={e=>onAssign(e.target.value)}><option value="">Choose duty…</option>{shifts.map((shift:Shift)=><option key={shift.id} value={shift.id}>{shift.category==='Leave'?'Add '+shift.name+' · keep duty':shift.name}</option>)}</select><button disabled={!dates.length} onClick={()=>onCopy(true)}><Scissors size={16}/>Cut duties</button><button disabled={!dates.length} onClick={()=>onAssign('')}><Trash2 size={16}/>Clear duties</button></div></details>
  </>:block?<div className="edit-paste-panel">
   <p className="hint">{block.cut?'Move':'Paste'} the copied duties by tapping a destination in the calendar, or choosing its first date here.</p>
   <label className="field"><span>Start pasting on</span><input aria-label="Paste start date" type="date" value={selected} onChange={e=>{if(e.target.value)onTarget(e.target.value);}}/></label>
   <p className="edit-paste-range">{fmt(selected)} → {fmt(addDays(selected,dayNumber(block.end)-dayNumber(block.start)))} · {block.entries.length} duties</p>
   <div className="edit-primary-actions"><button className="primary" onClick={onPaste}><ClipboardPaste size={18}/>{block.cut?'Move here':'Paste here'}</button>{!block.cut&&<button className="quiet-button" onClick={onRepeatCopy}><Repeat2 size={18}/>Repeat pattern</button>}</div>
  </div>:null}
  {block&&<details className="disclosure edit-clipboard"><summary>{block.cut?'Ready to move':'Copied'} · {block.entries.length} dates</summary><p className="hint">{fmt(block.start)} → {fmt(block.end)}. Copies duties only; leave annotations, notes and appointments stay on their dates.</p><div className="edit-clipboard-sequence">{block.entries.slice(0,16).map((entry,index)=>{const shift=shifts.find((s:Shift)=>s.id===entry.shiftId);return <span key={index} title={'Day '+(entry.offset+1)}>{shift?<ShiftChip shift={shift} compact/>:'Blank'}</span>;})}{block.entries.length>16&&<span>+{block.entries.length-16}</span>}</div></details>}
  <details className="disclosure"><summary>Pattern tools</summary><div className="edit-pattern-actions"><button className="quiet-button" onClick={onNewPattern}><Plus size={17}/>Build a pattern</button><button className="quiet-button" onClick={onSavedPatterns}><Layers size={17}/>Use saved pattern</button></div></details>
  {error&&<p className="danger" role="alert">{error}</p>}
  <div className="edit-history-actions"><button className="text-button" onClick={onUndo}><Undo2 size={17}/>Undo</button><button className="text-button" onClick={onRedo}><Redo2 size={17}/>Redo</button></div>
 </section>;
}
