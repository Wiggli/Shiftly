'use client';
import React,{useState} from 'react';
import {ChevronLeft,ChevronRight,Plus,Trash2} from 'lucide-react';
import {Pattern,Shift,addDays,isDate} from '../../lib/engine';
import {shiftChoices} from '../../lib/shift-choices';
import ShiftEditor from './ShiftEditor';
import {patternOverrides} from '../../lib/roster-edit';
import {Sheet,Field,ShiftChip,fmt,uid} from './primitives';
export default function PatternEditor({value,s,date,onClose,onBack,onSave,onShiftSave}:any){
 const [p,setP]=useState<Pattern>(value||{id:uid(),name:'My repeating schedule',items:[],start:date,repeat:0});
 const [step,setStep]=useState(1),[mode,setMode]=useState(value?.until?'until':!value||value?.repeat===0?'forever':'times'),[error,setError]=useState(''),[replace,setReplace]=useState(false),[busy,setBusy]=useState(false),[drag,setDrag]=useState(-1);
 const [editingShift,setEditingShift]=useState<Shift|null|undefined>(undefined),[selectedDay,setSelectedDay]=useState<number|null>(null);
 const available=shiftChoices(s),writable=s.role!=='viewer';
 function pick(id:string){setError('');if(selectedDay!==null){const items=[...p.items];items[selectedDay]=id;setP({...p,items});setSelectedDay(null);}else if(p.items.length<366)setP({...p,items:[...p.items,id]});}
 const effective={...p,repeat:mode==='forever'||mode==='until'?0:mode==='once'?1:p.repeat,until:mode==='until'?p.until:undefined};
 let last='',rangeError='';try{if(effective.repeat&&p.items.length){last=addDays(p.start,p.items.length*effective.repeat-1);if(!isDate(last))rangeError='Choose fewer repetitions, within the supported calendar years.';}}catch{rangeError='Choose a valid start date and repetition count.';}
 let overrides=0;try{if(!rangeError&&p.items.length)overrides=patternOverrides(s,effective).length;}catch{}
 function reorder(from:number,to:number){if(from<0||to<0||from>=p.items.length||to>=p.items.length)return;const items=[...p.items];const [item]=items.splice(from,1);items.splice(to,0,item);setP({...p,items});setSelectedDay(to);setDrag(-1);}
 if(editingShift!==undefined)return <ShiftEditor value={editingShift} writable={writable&&(!editingShift||!s.rosterScope||editingShift.rosterId===s.rosterScope)} onClose={()=>setEditingShift(undefined)} onBack={()=>setEditingShift(undefined)} onSave={async(shift:Shift)=>{const isNew=!s.shifts.some((item:Shift)=>item.id===shift.id);const saved=await onShiftSave(shift);if(saved===false)return false;if(isNew&&!shift.archived)pick(shift.id);setEditingShift(undefined);return true;}}/>;
 return <Sheet title={step===1?'Edit repeating days':'Start repeating'} onClose={onClose} onBack={step===2?()=>{setStep(1);setError('');}:onBack} backDisabled={busy} wide>
 {value?.templateShifts?.length>0&&<p className="hint">Missing Rest or Off shift types will be added when you apply this pattern.</p>}<p className="step-caption">Step {step} of 2 · {step===1?'Choose the repeating days':'Choose when it starts'}</p>
 <form onSubmit={async e=>{e.preventDefault();if(step===1){if(!p.items.length){setError('Add at least one day.');return;}setError('');setSelectedDay(null);setStep(2);return;}if(busy||!writable)return;if(rangeError){setError(rangeError);return;}setBusy(true);setError('');try{if(await onSave(effective,replace)===false)setError('Your schedule could not be saved. Your choices are still here.');}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>
 <fieldset className="shift-editor-fields" disabled={busy||!writable}>
 {step===1?<>
 <h3>Your sequence · {p.items.length} days</h3><p className="hint">Tap shifts below to add days. Tap a numbered day to replace, move or remove it.</p>
 <div className="builder-sequence compact-sequence">{p.items.map((id,i)=>{const shift=s.shifts.find((x:Shift)=>x.id===id);return <button type="button" className={'sequence-day '+(selectedDay===i?'selected-day':'')} draggable key={i} onDragStart={()=>setDrag(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>reorder(drag,i)} aria-label={'Replace day '+(i+1)+': '+(shift?.name||'Blank')} aria-pressed={selectedDay===i} onClick={()=>setSelectedDay(selectedDay===i?null:i)}><small>{i+1}</small>{shift?<ShiftChip shift={shift} compact/>:<span>Blank</span>}</button>;})}{!p.items.length&&<p>Your repeating days will appear here.</p>}</div>
 {selectedDay!==null&&<div className="selected-day-tools"><strong>Day {selectedDay+1}</strong><button type="button" disabled={!selectedDay} aria-label={'Move day '+(selectedDay+1)+' earlier'} onClick={()=>reorder(selectedDay,selectedDay-1)}><ChevronLeft size={17}/></button><button type="button" disabled={selectedDay===p.items.length-1} aria-label={'Move day '+(selectedDay+1)+' later'} onClick={()=>reorder(selectedDay,selectedDay+1)}><ChevronRight size={17}/></button><button type="button" aria-label={'Remove day '+(selectedDay+1)} onClick={()=>{setP({...p,items:p.items.filter((_,i)=>i!==selectedDay)});setSelectedDay(null);}}><Trash2 size={17}/>Remove</button><button type="button" className="text-button" onClick={()=>setSelectedDay(null)}>Done</button></div>}
 <p className="hint">{selectedDay!==null?'Choose a replacement below.':'Choose the next day below.'}</p>
 <div className="shift-palette">{available.map(x=><button type="button" key={x.id} disabled={selectedDay===null&&p.items.length>=366} onClick={()=>pick(x.id)}><ShiftChip shift={x}/></button>)}<button type="button" className="quiet-button" disabled={selectedDay===null&&p.items.length>=366} onClick={()=>pick('')}>Blank day</button></div>
 {onShiftSave&&<button type="button" className="quiet-button full" onClick={()=>setEditingShift(null)}><Plus size={17}/>Create a shift</button>}
 {onShiftSave&&<details className="disclosure"><summary>Manage shifts · names, times, colours & delete</summary><p className="hint">Edit a shift type here. Removing a day above only changes this pattern.</p><div className="shift-palette">{s.shifts.map((x:Shift)=><button type="button" key={x.id} onClick={()=>setEditingShift(x)}><ShiftChip shift={x}/>{x.archived&&<small>Deleted</small>}</button>)}</div></details>}
 </>:<>
 <Field label="Schedule name"><input required maxLength={100} value={p.name} onChange={e=>setP({...p,name:e.target.value})}/></Field>
 <p className="hint">The start date uses day 1 of the sequence you chose. Check the dates below to confirm it matches your roster.</p><Field label="Start date (day 1)"><input required type="date" value={p.start} onChange={e=>setP({...p,start:e.target.value})}/></Field>
 <Field label="Repeat"><select value={mode} onChange={e=>{setMode(e.target.value);if(e.target.value==='times'&&p.repeat<1)setP({...p,repeat:100});}}><option value="times">A number of times</option><option value="forever">Keep repeating</option><option value="until">Until a date</option><option value="once">Once</option></select></Field>
 {mode==='times'&&<Field label="Number of repetitions"><input type="number" required min="1" max="100000" value={p.repeat} onChange={e=>setP({...p,repeat:+e.target.value})}/></Field>}
 {mode==='until'&&<Field label="End date"><input type="date" required min={p.start} value={p.until||''} onChange={e=>setP({...p,until:e.target.value})}/></Field>}
 <div className="pattern-preview"><div><strong>{effective.repeat?(p.items.length*effective.repeat).toLocaleString()+' days planned':mode==='until'?'Repeats until '+(p.until?fmt(p.until):'your chosen date'):'Keeps repeating'}</strong><p>{last&&!rangeError?fmt(p.start)+' to '+fmt(last,{day:'numeric',month:'long',year:'numeric'}):'Starts '+fmt(p.start)}</p></div></div>
 <h3 className="section-title">Check your first days</h3><div className="rotation-date-preview">{isDate(p.start)&&!rangeError&&p.items.slice(0,14).map((id,i)=>{const shift=s.shifts.find((x:Shift)=>x.id===id);return <div key={i}><small>{fmt(addDays(p.start,i))}</small>{shift?<ShiftChip shift={shift} compact/>:<span>Blank</span>}</div>;})}</div><details className="disclosure"><summary>Existing shifts · keep or replace individual edits</summary><Field label="Existing individual shift edits"><select value={replace?'replace':'keep'} onChange={e=>setReplace(e.target.value==='replace')}><option value="keep">Keep my individual edits</option><option value="replace">Replace edits in this pattern’s date range</option></select></Field><p className="hint">{overrides} individual edits fall in this range. Events and notes stay in place, and Undo restores the previous roster.</p></details>
 </>}
 {(error||rangeError)&&<p className="danger" role="alert">{error||rangeError}</p>}
 </fieldset>
 <div className="form-actions">{step===2&&<button type="button" className="quiet-button" disabled={busy} onClick={()=>setStep(1)}><ChevronLeft size={17}/>Edit sequence</button>}<button className="primary" disabled={busy||(step===2&&!writable)}>{busy?'Saving…':step===1?'Continue':'Save schedule'}</button></div>
 </form></Sheet>;
}
