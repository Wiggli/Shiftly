import {authClient,authConfig,FLOW_COOKIE} from '../../../lib/auth';
import {getChatGPTUser} from '../../chatgpt-auth';
import {cookies} from 'next/headers';
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'FORBIDDEN'},{status:403});
  if(authConfig()){
    const {error}=await (await authClient()).auth.signOut({scope:'local'});
    if(error)return Response.json({error:'Sign-out failed. Please try again.'},{status:503});
  }
  (await cookies()).delete(FLOW_COOKIE);
  const legacy=await getChatGPTUser();
  return Response.json({next:legacy?'/signout-with-chatgpt?return_to=%2F':'/'},{headers:{'Cache-Control':'private, no-store'}});
}
