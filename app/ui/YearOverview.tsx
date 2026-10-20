import {resolveShift,type Snapshot} from '../../lib/engine';
import {cellColours} from '../../lib/cell-colours';
import {miniMonthDates} from '../../lib/calendar-layout';
import {fmt} from './primitives';

export default function YearOverview({snapshot,year,weekStart,onMonth}:{snapshot:Snapshot;year:string;weekStart:number;onMonth:(month:string)=>void}){
 return <div className="year-grid">{Array.from({length:12},(_,index)=>{
  const month=year+'-'+String(index+1).padStart(2,'0');
  return <button key={month} className="mini-month" aria-label={'Open '+fmt(month+'-01',{month:'long',year:'numeric'})} onClick={()=>onMonth(month)}>
   <h3>{fmt(month+'-01',{month:'long'})}</h3>
   <div className="mini-weekdays" aria-hidden="true">{Array.from({length:7},(_,day)=><small key={day}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][(day+weekStart)%7]}</small>)}</div>
   <div className="mini-date-grid" aria-hidden="true">{miniMonthDates(month,weekStart).map((date,day)=>{
    const duty=date?resolveShift(snapshot,date):undefined;
    return <span key={day} data-mini-date={date||undefined} style={{background:duty?.color,color:duty?cellColours(duty)['--duty-cell-ink']:undefined}}>{date?Number(date.slice(8)):''}</span>;
   })}</div>
  </button>;
 })}</div>;
}
