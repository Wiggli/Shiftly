'use client';
import {CalendarDays,Rows3,List,Grid2X2,Heart,Check,MoreHorizontal} from 'lucide-react';
import {Sheet} from './primitives';
const views=[['Month','The whole month',CalendarDays],['Week','Seven days with more space',Rows3],['Agenda','Duties and entries in a list',List],['Year','All twelve months',Grid2X2],['Together','Compare your schedules',Heart]] as const;
export function CalendarViewControl({view,onChange,onMore}:{view:string;onChange:(view:string)=>void;onMore:()=>void}){
 return <div className="segmented calendar-view-control" role="group" aria-label="Calendar view">{['Month','Week'].map(name=><button key={name} type="button" className={view===name?'active':''} aria-pressed={view===name} onClick={()=>onChange(name)}>{name}</button>)}<button type="button" className={!['Month','Week'].includes(view)?'active more-views':'more-views'} aria-label="More calendar views" aria-haspopup="dialog" onClick={onMore}>{['Month','Week'].includes(view)?<MoreHorizontal size={20}/>:view}</button></div>;
}
export function CalendarViewSheet({view,together,onChange,onClose}:{view:string;together:boolean;onChange:(view:string)=>void;onClose:()=>void}){
 return <Sheet title="Calendar view" onClose={onClose}><div className="more-menu view-options">{views.filter(([name])=>name!=='Together'||together).map(([name,description,Icon])=><button type="button" className="more-row" key={name} aria-pressed={name===view} onClick={()=>{onChange(name);onClose();}}><span className="menu-icon tone-blue"><Icon size={20}/></span><span className="menu-copy"><strong>{name}</strong><small>{description}</small></span>{name===view&&<Check size={20}/>}</button>)}</div></Sheet>;
}
