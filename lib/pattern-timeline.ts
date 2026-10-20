import {addDays,dayNumber,type Pattern} from './engine';
export function patternTimeline(pattern:Pattern,date:string,patterns:Pattern[]=[pattern]){
 const end=pattern.repeat>0?addDays(pattern.start,pattern.items.length*pattern.repeat-1):undefined;
 const last=pattern.until&&(!end||pattern.until<end)?pattern.until:end;
 const covers=(p:Pattern)=>date>=p.start&&p.items.length>0&&(!p.until||date<=p.until)&&(p.repeat===0||dayNumber(date)-dayNumber(p.start)<p.items.length*p.repeat);
 const elapsed=dayNumber(date)-dayNumber(pattern.start);
 const state=date<pattern.start?'upcoming':last&&date>last?'ended':[...patterns].reverse().find(covers)?.id===pattern.id?'active':'covered';
 const cycleDay=pattern.items.length?((elapsed%pattern.items.length)+pattern.items.length)%pattern.items.length+1:0;
 const candidate=state==='active'?addDays(date,pattern.items.length-cycleDay+1):pattern.start;
 return {state,last,cycleDay,nextCycle:state==='ended'||state==='covered'||last&&candidate>last?undefined:candidate};
}
