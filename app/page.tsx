import CalendarApp from './ui/CalendarApp';
import {getAppUser} from '../lib/auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAppUser();return <CalendarApp identity={user?{id:user.userId,name:user.fullName||user.email,email:user.email,avatarUrl:user.provider==='google'?user.avatarUrl:null,provider:user.provider}:null}/>;}
