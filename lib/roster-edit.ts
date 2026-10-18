import {Snapshot,Occurrence,addDays,dayNumber,isDate,resolveShift} from './engine';
import {occurrenceId} from './rosters';
export type RosterBlock={calendarId:string;rosterId:string;start:string;end:string;cut:boolean;entries:{offset:number;shiftId:string;override?:Occurrence}[]};
export function dateRange(start:string,end:string,limit=366){if(!isDate(start)||!isDate(end)||end<start)throw new Error('Choose a valid start and end date.');const count=dayNumber(end)-dayNumber(start)+1;if(count>limit)throw new Error(`Select up to ${limit} days at a time.`);return Array.from({length:count},(_,i)=>addDays(start,i));}
export function selectionPattern(s:Snapshot,dates:string[]){const sorted=[...new Set(dates)].sort();if(!sorted.length)throw new Error('Select the dates to repeat first.');return dateRange(sorted[0],sorted[sorted.length-1]).map(date=>resolveShift(s,date)?.id||'');}
export function copyBlock(s:Snapshot,dates:string[],cut=false):RosterBlock{const sorted=[...new Set(dates)].sort();if(!sorted.length)throw new Error('Select dates to copy first.');dateRange(sorted[0],sorted[sorted.length-1]);const rosterId=s.activeRosterId||'main';return {calendarId:s.calendar.id,rosterId,start:sorted[0],end:sorted[sorted.length-1],cut,entries:sorted.map(date=>({offset:dayNumber(date)-dayNumber(sorted[0]),shiftId:resolveShift(s,date)?.id||'',override:(()=>{const o=s.occurrences.find(o=>o.date===date&&(o.rosterId||'main')===rosterId);return o?{...o}:undefined;})()}))};}
export function pasteBlock(s:Snapshot,block:RosterBlock,target:string){if(block.calendarId!==s.calendar.id||block.rosterId!==(s.activeRosterId||'main'))throw new Error('Paste into the roster you copied from.');if(!isDate(target))throw new Error('Choose a valid paste date.');if(block.cut)for(const entry of block.entries){const date=addDays(block.start,entry.offset);const current=s.occurrences.find(o=>o.date===date&&(o.rosterId||'main')===block.rosterId);if((resolveShift(s,date)?.id||'')!==entry.shiftId||JSON.stringify(current)!==JSON.stringify(entry.override))throw new Error('The source shifts changed after Cut. Select and cut them again before moving.');}const changes=new Map<string,any>();const put=(date:string,shiftId:string,override?:Occurrence)=>{const id=occurrenceId(block.rosterId,date);changes.set(id,{kind:'occurrence',id,data:{...override,id,rosterId:block.rosterId,date,shiftId,deleted:!shiftId}});};if(block.cut)for(const entry of block.entries)put(addDays(block.start,entry.offset),'');for(const entry of block.entries)put(addDays(target,entry.offset),entry.shiftId,entry.override);return [...changes.values()];}
export function patternOverrides(s:Snapshot,p:{start:string;items:string[];repeat:number;until?:string}){const end=p.until||(p.repeat?addDays(p.start,p.items.length*p.repeat-1):'9999-12-31');return s.occurrences.filter(o=>(o.rosterId||'main')===(s.activeRosterId||'main')&&o.date>=p.start&&o.date<=end);}

// Repeat the copied duties, rather than re-reading source dates that may have
// changed since Copy. Sparse copies are valid for Paste, but not a full cycle.
export function copiedPattern(block:RosterBlock){
 const span=dayNumber(block.end)-dayNumber(block.start)+1;
 if(span<1||span>366||block.entries.length!==span)throw new Error('To repeat a pattern, copy a continuous range including every Rest, Off and blank day.');
 const entries=[...block.entries].sort((a,b)=>a.offset-b.offset);
 if(entries.some((entry,index)=>entry.offset!==index))throw new Error('The copied pattern is missing dates. Copy a continuous range again.');
 return entries.map(entry=>entry.shiftId);
}

export function copyPatternAt(pattern:import('./engine').Pattern,start:string,id:string){
 if(!isDate(start)||!id||id===pattern.id)throw new Error('Choose a new pattern ID and a valid start date.');
 return {...pattern,id,name:pattern.name.slice(0,93)+' · copy',items:[...pattern.items],start,until:undefined};
}
