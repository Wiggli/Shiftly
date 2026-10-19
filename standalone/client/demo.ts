import {defaults,addDays} from '../../lib/engine';
// Fictional, in-memory review data. No account, storage or backend is used.
export function demoCalendar(date='2026-10-19'){
 const month=date.slice(0,7),first=month+'-01';
 const shifts=structuredClone(defaults);
 shifts.push({...shifts.find(shift=>shift.id==='off')!,id:'rest',name:'Rest',short:'R',emoji:'🛌'});
 return {calendar:{id:'ui-preview',name:'Sample calendar',timezone:'Europe/Malta',revision:0,settings:{weekStart:1,label:'text',events:true,eventLabels:true}},role:'owner',rosters:[{id:'main',name:'My roster',color:'#007aff'}],shifts,patterns:[{id:'demo-pattern',name:'Sample rotation',start:first,items:['day','day','night','rest','off'],repeat:100}],occurrences:[],events:[
  {id:'demo-ot',date,rosterId:'main',title:'Overtime',emoji:'⏱️',time:'19:00',endTime:'23:00',notes:'Extra evening hours',private:true,entryType:'overtime',reminders:[]},
  {id:'demo-note',date,rosterId:'main',title:'Daily note',emoji:'📝',time:'',notes:'Remember your training folder',private:true,reminders:[]},
  {id:'demo-leave',date:addDays(date,3),rosterId:'main',title:'Annual leave',emoji:'🌿',time:'',notes:'Afternoon plans',private:false,entryType:'leave',reminders:[]},
  {id:'demo-plan',date:addDays(date,6),rosterId:'main',title:'Appointment',emoji:'📅',time:'15:30',notes:'A sample appointment',private:true,entryType:'appointment',reminders:[]}
 ],members:[],invites:[],audit:[],calendars:[{id:'ui-preview',name:'Sample calendar'}]};
}
