// Apple Calendar colours belong to calendar collections, rather than individual events.
export const calendarGroups=[
 {id:'calendar',name:'Day shifts',color:'#D96859',description:'Scheduled daytime work'},
 {id:'nights',name:'Night shifts',color:'#6469B4',description:'Overnight work with its real hours'},
 {id:'overtime',name:'Overtime',color:'#C48732',description:'Additional work marked as overtime'},
 {id:'leave',name:'Leave',color:'#4E8E71',description:'Annual, study and other leave'},
 {id:'events',name:'Plans',color:'#7C6AA6',description:'Appointments and custom entries'},
 {id:'days-off',name:'Rest & Off',color:'#89929F',description:'Optional non-working days'},
] as const;
// Existing colour-group accounts return to one calendar; grouping is an explicit advanced choice.
export function calendarDisplayOptions(meta:any){return {includeNotes:meta?.includeNotes===true,includeOff:meta?.includeOff===true,compactTitles:meta?.compactTitles!==false,groupByType:meta?.layoutVersion===2&&meta?.groupByType===true};}
