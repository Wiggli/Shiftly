import {addDays,Pattern,isDate} from './engine';

// End future generation, preserving the linked source of historical duties.
export function stopScheduleChanges(pattern:Pattern,from:string){
 if(!isDate(from))throw Error('Choose a valid date.');
 if(pattern.until&&pattern.until<from)return [];
 if(pattern.repeat&&addDays(pattern.start,pattern.items.length*pattern.repeat-1)<from)return [];
 return pattern.start>=from?[{kind:'pattern',id:pattern.id,remove:true}]:[{kind:'pattern',id:pattern.id,data:{...pattern,until:addDays(from,-1)}}];
}

export function scheduleFromDate(pattern:Pattern,from:string,id:string){
 if(!isDate(from)||from<pattern.start)throw Error('Choose a date on or after the schedule starts.');
 const offset=Math.floor((Date.parse(from)-Date.parse(pattern.start))/86400000)%pattern.items.length;
 const last=pattern.until||(pattern.repeat?addDays(pattern.start,pattern.items.length*pattern.repeat-1):undefined);
 if(last&&from>last)throw Error('This schedule has finished. Create a new schedule to plan ahead.');
 return {...pattern,id,items:[...pattern.items.slice(offset),...pattern.items.slice(0,offset)],start:from,repeat:0,until:last,splitFromPatternId:pattern.id};
}
