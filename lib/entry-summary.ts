import {addDays,dayNumber,eventsOn,isDate,resolveShift,zonedInstant,type Snapshot} from './engine';

// Annotations supplement a planned duty; they do not rewrite its paid hours.
export function entrySummary(snapshot:Snapshot,start:string,end:string){
 const summary={leaveDays:0,overtimeHours:0,overtimeEntries:0,untimedOvertime:0};
 if(!isDate(start)||!isDate(end)||start>end||dayNumber(end)-dayNumber(start)>36600)return summary;
 const roster=snapshot.activeRosterId||'main';
 const events=snapshot.events.filter(event=>(event.rosterId||'main')===roster);
 for(let date=start;date<=end;date=addDays(date,1)){
  let leave=['Leave','Sick'].includes(resolveShift(snapshot,date)?.category||'');
  for(const event of eventsOn(events,date)){
   const kind=event.entryType||(event.title==='Overtime'&&event.emoji==='⏱️'?'overtime':event.title==='Leave'&&event.emoji==='🌿'?'leave':'custom');
   if(kind==='leave')leave=true;
   if(kind!=='overtime')continue;
   summary.overtimeEntries++;
   if(!event.time||!event.endTime){summary.untimedOvertime++;continue;}
   summary.overtimeHours+=Math.max(0,(zonedInstant(addDays(date,event.endTime<=event.time?1:0),event.endTime,snapshot.calendar.timezone)-zonedInstant(date,event.time,snapshot.calendar.timezone))/3600000);
  }
  if(leave)summary.leaveDays++;
 }
 return summary;
}
