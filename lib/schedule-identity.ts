// Presentation only. Authorization always uses verified principals and server grants.
export const accessLabel=(role:string)=>role==='owner'?'Owner':role==='editor'?'Can edit':'View only';
export function ownerName(value:any){const name=typeof value==='string'?value.trim().slice(0,100):'';return name&&!name.includes('@')?name:'';}
export function scheduleIdentity(calendar:any,roster:any,role:string){
 const own=role==='owner',name=ownerName(calendar?.owner_name||calendar?.ownerName),first=name.replace(/['’]+$/,'');
 const generic=/^(?:(?:my|personal|primary|default)\s+)?(?:calendar|roster|schedule)$/i.test(roster?.name?.trim()||'');
 const ownerTitle=first?first+(/s$/i.test(first)?'’':'’s')+' Schedule':'Shared Schedule';
 const title=own?(generic?'My Schedule':roster?.name||'My Schedule'):ownerTitle;
 const detail=!generic&&roster?.name&&roster.name!==name?roster.name:'';
 return {title,detail:own?'':detail,ownerName:name||'Schedule owner',shared:!own,role,permission:accessLabel(role),subtitle:own?'Your schedule':`Shared with you · ${accessLabel(role)}`,key:String(calendar?.id)+':'+String(roster?.id||'main')};
}
export function scheduleChoices(catalog:any[]=[]){return catalog.flatMap(calendar=>(calendar.rosters||[{id:calendar.rosterScope||'main',name:calendar.name}]).filter((r:any)=>!r.archived).map((roster:any)=>({...scheduleIdentity(calendar,roster,calendar.role),calendarId:calendar.id,rosterId:roster.id,roster,calendar})));}
