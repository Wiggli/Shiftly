import type {Shift} from './engine';
// Keep every saved definition intact. Prefer definitions already used in this
// roster when imported definitions have the same name as unused starter types.
export function shiftChoices(snapshot:any):Shift[]{
 const used=new Set([...(snapshot.patterns||[]).flatMap((p:any)=>p.items),...(snapshot.occurrences||[]).filter((o:any)=>!o.deleted).map((o:any)=>o.shiftId)]);
 const active:Shift[]=(snapshot.shifts||[]).filter((s:Shift)=>!s.archived);
 const names=new Set(active.filter(s=>used.has(s.id)).map(s=>s.name.trim().toLowerCase()));
 return active.filter(s=>used.has(s.id)||!names.has(s.name.trim().toLowerCase()));
}
