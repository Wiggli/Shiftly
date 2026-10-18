export function canActivateUpdate(state:{ready:boolean;safe:boolean;online:boolean;visible:boolean;editing:boolean;updating:boolean}){
 return state.ready&&state.safe&&state.online&&state.visible&&!state.editing&&!state.updating;
}
