import {calendarRosters} from './rosters';
import {defaults} from './engine';

export function sharingRoster(snapshot:any,id:string){
 const roster=calendarRosters(snapshot).find(r=>r.id===id&&!r.archived);
 if(!roster)throw new Error('This roster is no longer available');
 return roster;
}
export function scopeSnapshot(snapshot:any,scope:string|null){
 if(!scope)return snapshot;
 const roster=sharingRoster(snapshot,scope);
 const patterns=snapshot.patterns.filter((p:any)=>(p.rosterId||'main')===scope);
 const occurrences=snapshot.occurrences.filter((p:any)=>(p.rosterId||'main')===scope);
 const used=new Set([...patterns.flatMap((p:any)=>p.items),...occurrences.map((p:any)=>p.shiftId)]);
 const shifts=snapshot.shifts.filter((p:any)=>p.rosterId===scope||used.has(p.id)||!p.rosterId&&defaults.some(d=>d.id===p.id&&Object.keys(d).every(key=>(d as any)[key]===p[key])));
 const settings={...snapshot.calendar.settings};delete settings.overlayCalendar;
 if(settings.shiftOrder)settings.shiftOrder=settings.shiftOrder.filter((id:string)=>shifts.some((p:any)=>p.id===id));
 return {...snapshot,audit:(snapshot.audit||[]).map((a:any)=>({...a,summary:'Shared schedule updated'})),rosterScope:scope,calendar:{...snapshot.calendar,rosterScope:scope,settings},rosters:[roster],patterns,occurrences,shifts,events:snapshot.events.filter((p:any)=>(p.rosterId||'main')===scope)};
}
export function assertScopedChanges(snapshot:any,scope:string|null,changes:any[]){
 if(!scope)return;
 const visible=scopeSnapshot(snapshot,scope),shiftIds=new Set(visible.shifts.map((p:any)=>p.id));
 const lists:any={pattern:'patterns',occurrence:'occurrences',event:'events',shift:'shifts'};
 for(const change of changes){
  if(!lists[change.kind])throw new Error('FORBIDDEN');
  const existing=snapshot[lists[change.kind]].find((p:any)=>p.id===change.id);
  if(change.kind==='shift'){
   if(existing&&existing.rosterId!==scope)throw new Error('Create a new shift type for this roster instead of changing a shared type.');
   if(!change.remove&&change.data?.rosterId!==scope)throw new Error('FORBIDDEN');
  }else{
   if(existing&&(existing.rosterId||'main')!==scope)throw new Error('FORBIDDEN');
   if(change.remove&&!existing)throw new Error('FORBIDDEN');
   if(!change.remove&&(change.data?.rosterId||'main')!==scope)throw new Error('FORBIDDEN');
   const references=change.kind==='pattern'?change.data?.items:change.kind==='occurrence'&&!change.data?.deleted?[change.data?.shiftId]:[];
   for(const id of references||[])if(id&&!shiftIds.has(id)&&!changes.some(c=>c.kind==='shift'&&!c.remove&&c.id===id&&c.data?.rosterId===scope))throw new Error('FORBIDDEN');
  }
 }
}
