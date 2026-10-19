import type {Shift} from '../../lib/engine';

export default function WeekDuty({shift,icons=true}:{shift?:Shift;icons?:boolean}){
 const overnight=!!shift?.start&&!!shift.end&&(shift.durationDays??(shift.end<=shift.start?1:0))>0;
 return <div className={'week-duty'+(!shift?' week-duty-unplanned':'')}>
  {icons&&<span className="week-duty-icon" aria-hidden="true">{shift?.emoji||'＋'}</span>}
  <span className="week-duty-copy">
   <strong>{shift?.name||'Unplanned'}</strong>
   {shift?.start&&<span className="week-duty-time">{shift.start}–{shift.end}{overnight&&<small>+{shift.durationDays||1} day</small>}</span>}
  </span>
 </div>;
}
