/** Keep quick entries on a date in the month currently being viewed. */
export function dateInMonth(selected:string,month:string){
 if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month))return selected;
 const last=new Date(month+'-01T12:00:00Z');last.setUTCMonth(last.getUTCMonth()+1,0);
 const day=Math.min(Number(selected.slice(8))||1,last.getUTCDate());
 return month+'-'+String(Math.max(1,day)).padStart(2,'0');
}
