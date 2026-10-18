import type {Shift} from '../../lib/engine';

export default function CellDuty({shift,settings,annotated=false}:{shift:Shift;settings:any;annotated?:boolean}){
 return <div aria-label={'Planned duty: '+shift.name} className={'cell-shift '+(settings.label==='icon'&&!annotated?'icon-only':'')+(annotated?' annotated-duty':'')}>{settings.icons!==false&&settings.label!=='text'&&<span>{shift.emoji}</span>}{(annotated||settings.label!=='icon')&&<strong>{shift.short}</strong>}{settings.times&&shift.start&&<small>{shift.start}</small>}</div>;
}
