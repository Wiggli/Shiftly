import {addDays} from './engine';

// A fixed six-week frame keeps every month aligned in the year overview.
export function miniMonthDates(month:string,weekStart=1):(string|null)[]{
 const first=month+'-01';
 const offset=(new Date(first+'T12:00:00Z').getUTCDay()-weekStart+7)%7;
 return Array.from({length:42},(_,index)=>{const date=addDays(first,index-offset);return date.slice(0,7)===month?date:null;});
}
