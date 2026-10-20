import {defaults,addDays,resolveShift,type Snapshot} from '../../lib/engine';
// Fictional, in-memory review data. No account, storage or backend is used.
export function demoCalendar(date='2026-10-19',kind='dates'){
 const month=date.slice(0,7),first=month+'-01';
 const shifts=structuredClone(defaults);
 shifts.find(s=>s.id==='day')!.color='#373399';shifts.find(s=>s.id==='night')!.color='#f10c24';shifts.find(s=>s.id==='off')!.color='#f4f3fa';shifts.find(s=>s.id==='off')!.short='O';
 shifts.push({...shifts.find(shift=>shift.id==='off')!,id:'rest',name:'Rest',short:'R',emoji:'🛌',color:'#cff3f4'});
 const snapshot:Snapshot&{calendars:{id:string;name:string}[]}={calendar:{id:'ui-preview',name:'Sample calendar',timezone:'Europe/Malta',revision:0,settings:{weekStart:1,label:'short',events:true,eventLabels:true}},role:'owner',rosters:[{id:'main',name:'Sample Nurse DNRO',color:'#007aff'}],shifts,patterns:[{id:'demo-pattern',name:'DNRO with extra day',start:addDays(first,-3),items:['day','day','night','rest','off','day','night','rest','off','day','night','rest'],repeat:100}],occurrences:[],events:[
  {id:'demo-ot',date,rosterId:'main',title:'Overtime',emoji:'⏱️',time:'19:00',endTime:'23:00',notes:'Extra evening hours',private:true,entryType:'overtime',reminders:[]},
  {id:'demo-note',date,rosterId:'main',title:'Daily note',emoji:'📝',time:'',notes:'Remember your training folder',private:true,reminders:[]},
  {id:'demo-leave',date:addDays(date,3),rosterId:'main',title:'Annual leave',emoji:'🌿',time:'',notes:'Afternoon plans',private:false,entryType:'leave',reminders:[]},
  {id:'demo-plan',date:addDays(date,5),rosterId:'main',title:'Clinic appointment and review',emoji:'📅',time:'15:30',notes:'A sample appointment',private:true,entryType:'appointment',reminders:[]}
 ],members:[],invites:[],audit:[],calendars:[{id:'ui-preview',name:'Sample calendar'}]};
 if(['dates','stress','viewer'].includes(kind)){snapshot.occurrences=Array.from({length:120},(_,i)=>{const date=addDays(first,i);return {id:date,date,shiftId:resolveShift(snapshot,date)!.id};});snapshot.patterns=[];}
 if(kind==='empty'){snapshot.patterns=[];snapshot.occurrences=[];snapshot.events=[];}
 if(kind==='stress'){
  snapshot.rosters![0].name='Sample nurse · Main operating theatres and recovery';
  snapshot.calendar.name='Operating theatres and recovery · Sample calendar';
  snapshot.events[1].notes='Remember the training folder, the afternoon appointment and the updated handover notes.\nThis longer note checks wrapping without hiding the planned duty.';
  snapshot.events.push({...snapshot.events[0],id:'demo-long-entry',title:'A long appointment title that should wrap clearly',notes:'Details remain available when you open the selected date.'});
 }
 if(kind==='viewer')snapshot.role='viewer';
 return snapshot;
}
