import type {Shift,Pattern} from './engine';
import {isDate,defaults} from './engine';
export type WorkStyle='rotating'|'fixed'|'irregular';
type Role='day'|'night'|'rest'|'off';
export const familiarRhythms:{id:string;name:string;items:Role[];description:string;style:WorkStyle}[]=[
 {id:'dnro-extra',name:'DNRO with extra day',items:['day','day','night','rest','off','day','night','rest','off','day','night','rest'],description:'12 days. An extra Day replaces Off once each cycle. Start on the first of the two consecutive Day shifts.',style:'rotating'},
 {id:'day-night',name:'Day / night / rest / off',items:['day','night','rest','off'],description:'Four distinct days: Day, Night, Rest, then Off.',style:'rotating'},
 {id:'two-two',name:'2 days / 2 nights / 4 off',items:['day','day','night','night','off','off','off','off'],description:'Two Day shifts, two Night shifts, then four days off.',style:'rotating'},
 {id:'two-day-night',name:'2 days / night / rest / off',items:['day','day','night','rest','off'],description:'Two Day shifts, one Night, one Rest, then one Off.',style:'rotating'},
 {id:'four-on',name:'4 on / 4 off',items:['day','day','day','day','off','off','off','off'],description:'Four Day shifts followed by four days off.',style:'rotating'},
 {id:'weekdays',name:'Weekdays',items:['day','day','day','day','day','off','off'],description:'Work Monday to Friday. Saturday and Sunday are off.',style:'fixed'},
];
function findRoles(shifts:Shift[]){
 const active=shifts.filter(s=>!s.archived),named=(name:string)=>active.find(s=>s.category==='Off'&&s.name.trim().toLowerCase()===name);
 return {day:active.find(s=>s.id==='day'&&s.category==='Work')||active.find(s=>s.category==='Work'&&s.start&&s.start<s.end),night:active.find(s=>s.id==='night'&&s.category==='Work')||active.find(s=>s.category==='Work'&&!!s.start&&s.end<=s.start),rest:named('rest'),off:named('off')||active.find(s=>s.category==='Off'&&s.name.trim().toLowerCase()!=='rest')};
}
export function setupRotation(style:WorkStyle,template:string,shifts:Shift[],start:string,repeat:number):Omit<Pattern,'id'>|null{
 if(style==='irregular')return null;
 if(!isDate(start))throw Error('Choose a valid start date.');
 if(!Number.isInteger(repeat)||repeat<1||repeat>100000)throw Error('Choose between 1 and 100,000 repetitions.');
 const rhythm=familiarRhythms.find(t=>t.id===(style==='fixed'?'weekdays':template));
 if(!rhythm)throw Error('Choose a familiar rhythm or build a custom pattern.');
 const roles=findRoles(shifts);
 for(const role of new Set(rhythm.items))if(!roles[role])throw Error('Create a '+role[0].toUpperCase()+role.slice(1)+' shift, or build a custom pattern.');
 let items=rhythm.items.map(role=>roles[role]!.id);
 if(style==='fixed'){const weekday=(new Date(start+'T12:00:00Z').getUTCDay()+6)%7;items=[...items.slice(weekday),...items.slice(0,weekday)];}
 return {name:rhythm.name,items,start,repeat};
}
// Plan missing non-working definitions without changing the user's data until Apply.
export function planRotation(style:WorkStyle,template:string,shifts:Shift[],start:string,repeat:number){
 const rhythm=familiarRhythms.find(t=>t.id===(style==='fixed'?'weekdays':template)),roles=findRoles(shifts),shiftsToCreate:Shift[]=[];
 if(style!=='irregular'&&rhythm)for(const role of ['rest','off'] as const){if(rhythm.items.includes(role)&&!roles[role]){
  let id='template-'+role;let suffix=1;while([...shifts,...shiftsToCreate].some(s=>s.id===id))id='template-'+role+'-'+suffix++;
  shiftsToCreate.push({...defaults.find(s=>s.id==='off')!,id,name:role==='rest'?'Rest':'Off',short:role==='rest'?'R':'O',emoji:role==='rest'?'🛏️':'🏠',color:role==='rest'?'#bde8e5':'#e7e9ef'});
 }}
 const allShifts=[...shifts,...shiftsToCreate];
 return {pattern:setupRotation(style,template,allShifts,start,repeat),shiftsToCreate,shifts:allShifts};
}
