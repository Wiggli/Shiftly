'use client';
import {useState} from 'react';
import {ChevronRight,Plus,Copy,Trash2} from 'lucide-react';
import {Sheet,Field,ShiftChip,uid,fmt} from './primitives';
import ShiftEditor from './ShiftEditor';
import {shiftChoices} from '../../lib/shift-choices';
import {defaults,addDays,isDate,Shift} from '../../lib/engine';
import {planRotation,familiarRhythms} from '../../lib/setup';

// Setup drafts stay local until the complete schedule is saved atomically.
export default function GettingStarted({s,roster,date,onApply,onClose}:any){
 const [step,setStep]=useState(1),[style,setStyle]=useState('rotating'),[start,setStart]=useState(date),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [replacements,setReplacements]=useState<Record<string,string>>({});
 const [drafts,setDrafts]=useState<Shift[]>([]),[editing,setEditing]=useState<Shift|null|undefined>(undefined),[selected,setSelected]=useState<number|null>(null);
 const saved=shiftChoices(s).filter(sh=>sh.category!=='Leave');
 const base=[...saved.filter(sh=>!replacements[sh.id])];
 for(const source of [...defaults.filter(sh=>sh.category!=='Leave'),{...defaults[0],id:'evening',name:'Evening',short:'E',emoji:'🌆',start:'15:00',end:'23:00',color:'#9b72bf'}]){
  if([...base,...drafts].some(sh=>sh.name.toLowerCase()===source.name.toLowerCase()))continue;
  let id='setup-'+source.id;while(s.shifts.some((sh:Shift)=>sh.id===id)||base.some(sh=>sh.id===id))id+='-new';
  base.push({...source,id});
 }
 const shifts=[...base.filter(sh=>!replacements[sh.id]).map(sh=>drafts.find(d=>d.id===sh.id)||sh),...drafts.filter(sh=>!base.some(b=>b.id===sh.id))];
 const day=shifts.find(sh=>sh.name.toLowerCase()==='day')||shifts.find(sh=>sh.category==='Work')!;
 const night=shifts.find(sh=>sh.name.toLowerCase()==='night')||day,off=shifts.find(sh=>sh.name.toLowerCase()==='off')!;
 const [items,setItems]=useState<string[]>([day.id,day.id,night.id,night.id,off.id,off.id]);
 const [week,setWeek]=useState<string[]>([day.id,day.id,day.id,day.id,day.id,off.id,off.id]);
 const sequence=style==='fixed'?week:items;
 function update(next:string[]){style==='fixed'?setWeek(next):setItems(next);}
 async function apply(){
  if(busy)return;setError('');
  if(style!=='manual'&&(!sequence.length||!isDate(start))){setError('Choose your shifts and a valid start date.');return;}
  setBusy(true);
  try{
   const weekday=(new Date(start+'T12:00:00Z').getUTCDay()+6)%7;
   const ids=style==='fixed'?[...week.slice(weekday),...week.slice(0,weekday)]:items;
   const used=new Set(style==='manual'?[]:ids);
   const pending=shifts.filter(sh=>(used.has(sh.id)||drafts.some(d=>d.id===sh.id))&&(!s.shifts.some((saved:Shift)=>saved.id===sh.id)||drafts.some(d=>d.id===sh.id)));
   const ok=await onApply(roster,style==='manual'?null:{id:uid(),name:style==='fixed'?'My weekly schedule':'My repeating schedule',items:ids,start,repeat:0},pending);
   if(ok===false)setError('Your schedule could not be saved. Your choices are still here.');
  }catch(e:any){setError(e.message);}finally{setBusy(false);}
 }
 if(editing!==undefined)return <ShiftEditor value={editing} writable allowManagement={false} onBack={()=>setEditing(undefined)} onClose={()=>setEditing(undefined)} onSave={async(input:Shift)=>{
  const source=editing?.id;
  const shift=source&&s.shifts.some((sh:Shift)=>sh.id===source)?{...input,id:uid(),archived:false}:input;
  if(source&&shift.id!==source){setReplacements(old=>({...old,[source]:shift.id}));setItems(old=>old.map(id=>id===source?shift.id:id));setWeek(old=>old.map(id=>id===source?shift.id:id));}
  setDrafts(old=>[...old.filter(sh=>sh.id!==shift.id),shift]);setEditing(undefined);return true;
 }}/>;
 return <Sheet title={step===1?'Set up my schedule':step===2?'Choose my shifts':'When should it start?'} onClose={onClose} onBack={step>1?()=>{setStep(step-1);setSelected(null);setError('');}:undefined} backDisabled={busy}>
 <p className="step-caption">Step {step} of 3</p>
 <form onSubmit={e=>{e.preventDefault();if(step===1&&style==='manual'){void apply();return;}if(step<3){if(step===2&&!sequence.length){setError('Add at least one day.');return;}setStep(step+1);setSelected(null);setError('');}else void apply();}}>
 <fieldset className="shift-editor-fields" disabled={busy}>
 {step===1?<><h2>How do you normally work?</h2><div className="setup-work-choices">{[['rotating','Regular repeating pattern','The same sequence of shifts and days off.'],['fixed','Same shifts every week','Choose your shifts for Monday to Sunday.'],['manual','I’ll add shifts myself','For irregular schedules, or to start with an empty calendar.']].map(([id,label,help])=><button key={id} type="button" aria-pressed={style===id} onClick={()=>setStyle(id)}><strong>{label}</strong><span>{help}</span></button>)}</div></>:step===2?<>
 <h2>{style==='fixed'?'What does your week look like?':'What does your pattern look like?'}</h2><p className="hint">{style==='fixed'?'Tap a weekday to change its shift.':'Tap a day to change it, or choose a shift below to add another day.'}</p>
 {style==='rotating'&&<Field label="Start with an example"><select defaultValue="six" onChange={e=>{setSelected(null);if(e.target.value==='six')setItems([day.id,day.id,night.id,night.id,off.id,off.id]);else if(e.target.value==='custom')setItems([]);else{const plan=planRotation('rotating',e.target.value,shifts,start,1);setDrafts(old=>[...old,...plan.shiftsToCreate]);setItems(plan.pattern!.items);}}}><option value="six">Day / Day / Night / Night / Off / Off</option>{familiarRhythms.filter(r=>r.style==='rotating').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}<option value="custom">Build my own</option></select></Field>}
 <div className="builder-sequence compact-sequence">{sequence.map((id,i)=><button type="button" className={'sequence-day '+(selected===i?'selected-day':'')} key={i} aria-pressed={selected===i} aria-label={'Change '+(style==='fixed'?['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]:'day '+(i+1))} onClick={()=>setSelected(selected===i?null:i)}><small>{style==='fixed'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]:'Day '+(i+1)}</small><ShiftChip shift={shifts.find(sh=>sh.id===id)} compact/></button>)}</div>
 {selected!==null&&<div className="selected-day-tools"><strong>{style==='fixed'?'Choose its shift':'Day '+(selected+1)}</strong>{style!=='fixed'&&<><button type="button" aria-label="Duplicate day" disabled={items.length>=366} onClick={()=>{const next=[...items];next.splice(selected+1,0,items[selected]);setItems(next);setSelected(null);}}><Copy size={16}/>Duplicate</button><button type="button" aria-label="Remove day" onClick={()=>{setItems(items.filter((_,i)=>i!==selected));setSelected(null);}}><Trash2 size={16}/>Remove</button></>}</div>}
 <div className="shift-palette" role="group" aria-label="Available shifts">{shifts.filter(sh=>!sh.archived).map(sh=><button type="button" key={sh.id} disabled={selected===null&&(style==='fixed'||sequence.length>=366)} onClick={()=>{if(selected===null)update([...sequence,sh.id]);else update(sequence.map((id,i)=>i===selected?sh.id:id));setSelected(null);}}><ShiftChip shift={sh}/></button>)}</div>
 {style==='rotating'&&<div className="day-tools"><button type="button" disabled={items.length>=366} onClick={()=>{setItems([...items,off.id]);setSelected(items.length);}}><Plus size={16}/>Add day</button><button type="button" onClick={()=>{setItems([]);setSelected(null);}}>Clear pattern</button></div>}
 <details className="disclosure"><summary>Change shift times or add a custom shift</summary><p className="hint">These shifts are ready to use. Changes are saved with your schedule.</p>{shifts.filter(sh=>!sh.archived).map(sh=><button key={sh.id} type="button" className="settings-shift" onClick={()=>setEditing(sh)}><ShiftChip shift={sh}/><span>{sh.start?sh.start+'–'+sh.end:'Day off'}</span><ChevronRight size={16}/></button>)}<button type="button" className="text-button" onClick={()=>setEditing(null)}>Create a custom shift</button></details>
 </>:<><p>{style==='fixed'?'Choose when to begin using this weekly schedule.':<>Choose the date for <strong>Day 1: {shifts.find(sh=>sh.id===items[0])?.name}</strong>.</>}</p><Field label="Start date"><input type="date" required value={start} onChange={e=>setStart(e.target.value)}/></Field><p className="hint">Your shifts will keep repeating automatically. You can change any day later.</p><div className="rotation-date-preview">{isDate(start)&&(style==='fixed'?Array.from({length:7},(_,i)=>week[((new Date(start+'T12:00:00Z').getUTCDay()+6)%7+i)%7]):items).slice(0,14).map((id,i)=><div key={i}><small>{fmt(addDays(start,i))}</small><ShiftChip compact shift={shifts.find(sh=>sh.id===id)}/></div>)}</div><p className="hint">Existing individual shifts, leave, overtime and notes will stay in place.</p></>}
 {error&&<p role="alert" className="danger">{error}</p>}
 </fieldset><button className="primary full" disabled={busy}>{busy?'Saving…':step===3?'Show my shifts':style==='manual'&&step===1?'Open my calendar':'Continue'}<ChevronRight size={17}/></button></form>
 <button className="text-button full" disabled={busy} onClick={onClose}>Set up later</button>
 </Sheet>;
}
