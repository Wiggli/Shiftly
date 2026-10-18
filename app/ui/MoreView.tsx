'use client';
import {BarChart3,Settings,Layers,Users,Download,ChevronRight,CalendarDays,BookOpen,RefreshCw,Info,Clock} from 'lucide-react';
export default function MoreView({onPage,onModal,onSettings}:any){
 const settings=onSettings||(()=>onPage('Settings'));
 const primary=[['Settings','Appearance and shift types',Settings,()=>settings(''),'gray'],['Sharing','Choose who can see or edit your roster',Users,()=>onModal('sharing'),'purple'],['Calendar sync','Connect Apple Calendar or another app',RefreshCw,()=>settings('sync'),'blue'],['App & help','Install, update or read the guide',BookOpen,()=>onModal('app'),'green']] as const;
 const extra=[['Insights','Hours, days off and estimated pay',BarChart3,()=>onPage('Insights'),'green'],['Manage rosters','Add another person or job',CalendarDays,()=>onModal('rosters'),'blue'],['Backup & files','Import, export and keep a copy',Download,()=>settings('data'),'green'],['Change history','Review your saved changes',Clock,()=>settings('history'),'gray'],['Getting started','Learn the basics',BookOpen,()=>onModal('intro'),'purple'],['About Shiftly','About the app',Info,()=>onModal('about'),'gray']] as const;
 const rows=(items:typeof primary|typeof extra)=><div className="more-menu">{items.map(([title,description,Icon,action,tone])=><button key={title} className="more-row" onClick={action}><span className={'menu-icon tone-'+tone}><Icon size={21}/></span><span className="menu-copy"><strong>{title}</strong><small>{description}</small></span><ChevronRight size={18}/></button>)}</div>;
 return <div className="grouped-menu simple-options">{rows(primary)}<details className="disclosure"><summary>More tools · totals, rosters &amp; backups</summary>{rows(extra)}</details></div>;
}
