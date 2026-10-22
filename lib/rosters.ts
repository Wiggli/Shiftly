import type {Snapshot} from './engine';
export type Roster={id:string;name:string;color:string;archived?:boolean};
export const defaultRoster:Roster={id:'main',name:'My schedule',color:'#1570ef'};
export function calendarRosters(snapshot:any):Roster[]{const saved=snapshot?.rosters||[];if(snapshot?.rosterScope||snapshot?.calendar?.rosterScope)return saved;return saved.some((r:Roster)=>r.id==='main')?saved:[defaultRoster,...saved];}
export function rosterSnapshot(snapshot:any,rosterId='main'):Snapshot&{rosters:Roster[];activeRosterId:string}{const rosters=calendarRosters(snapshot);const id=rosters.some(r=>r.id===rosterId)?rosterId:(rosters[0]?.id||'main');return {...snapshot,rosters,activeRosterId:id,patterns:snapshot.patterns.filter((p:any)=>(p.rosterId||'main')===id),occurrences:snapshot.occurrences.filter((o:any)=>(o.rosterId||'main')===id),events:snapshot.events.filter((e:any)=>(e.rosterId||'main')===id)};}
export const occurrenceId=(rosterId:string,date:string)=>rosterId==='main'?date:rosterId+':'+date;
export function rosterChanges(changes:any[],rosterId:string){return changes.map(change=>{if(!['pattern','occurrence','event'].includes(change.kind)||change.remove)return change;const data={...change.data,rosterId:change.data.rosterId||rosterId};if(change.kind==='occurrence'){data.id=occurrenceId(data.rosterId,data.date);return {...change,id:data.id,data};}return {...change,data};});}

export function visibleRosters(snapshot:any):Roster[]{return calendarRosters(snapshot).filter(r=>!r.archived);}
