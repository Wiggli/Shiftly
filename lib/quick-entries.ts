import type {Event} from './engine';
export type QuickEntryKind='overtime'|'leave'|'appointment';
export const quickEntries:{kind:QuickEntryKind;label:string;emoji:string}[]=[
 {kind:'overtime',label:'Overtime',emoji:'⏱️'},
 {kind:'leave',label:'Leave',emoji:'🌿'},
 {kind:'appointment',label:'Appointment',emoji:'🏥'},
];
// Draft only: the user reviews and saves before anything is written.
export function quickEntryDraft(kind:QuickEntryKind,date:string):Omit<Event,'id'>{
 const preset=quickEntries.find(entry=>entry.kind===kind);
 if(!preset)throw Error('Choose a supported quick entry.');
 return {date,title:preset.label,emoji:preset.emoji,time:'',notes:'',private:true,notesPrivate:true,entryType:kind,reminders:[]};
}

export function fastEntryDraft(kind:'overtime'|'leave'|'note',date:string,id:string):Event{
 if(kind==='note')return {id,date,title:'Daily note',emoji:'📝',time:'',notes:'',private:true,notesPrivate:true,entryType:'custom',reminders:[]};
 return {id,...quickEntryDraft(kind,date)};
}
export function dutyTimeChoices(shifts:import('./engine').Shift[]){
 const seen=new Set<string>();return shifts.filter(shift=>{const key=shift.start+'/'+shift.end;if(!['Work','Training'].includes(shift.category)||!shift.start||!shift.end||seen.has(key))return false;seen.add(key);return true;});
}
