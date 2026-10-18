import type {ReactNode} from 'react';
import {CalendarDays} from 'lucide-react';
export default function AppLoading({status='Opening your calendar…',children}:{status?:string;children?:ReactNode}){
 return <div className="boot"><div className="brand-icon"><CalendarDays/></div><h1>Shiftly</h1><p role="status">{status}</p>{children}</div>;
}
