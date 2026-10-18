import type {Snapshot} from './engine';
import {quickEntryDraft} from './quick-entries';

// Leave annotates the saved duty. Reapplying the palette choice updates the
// same dated annotation instead of accumulating copies or replacing an override.
export function shiftAssignmentChanges(snapshot:Snapshot,shiftId:string,dates:string[]){
 const rosterId=snapshot.activeRosterId||'main',shift=snapshot.shifts.find(item=>item.id===shiftId);
 return [...new Set(dates)].map(date=>{
  if(shift?.category==='Leave'){
   const existing=snapshot.events.find(item=>item.date===date&&(item.rosterId||'main')===rosterId&&item.entryType==='leave'&&item.title===shift.name&&(!item.recurrence||item.recurrence==='none')),id=existing?.id||crypto.randomUUID();
   return {kind:'event',id,data:{...quickEntryDraft('leave',date),...existing,id,date,rosterId,title:shift.name,emoji:shift.emoji,entryType:'leave'}};
  }
  return {kind:'occurrence',id:date,data:{id:date,date,shiftId,deleted:!shiftId}};
 });
}
