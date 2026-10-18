export function MaltaSignature({className=''}:{className?:string}){
 return <small className={'malta-signature '+className}>Made with care in Malta <span aria-hidden="true">🇲🇹</span></small>;
}
export default function CreatorCredit({compact=false}:{compact?:boolean}){
 return <footer className="creator-credit"><MaltaSignature/>{!compact&&<p className="hint">Created by Andre Bartolo to make shift planning easier for colleagues and families.</p>}</footer>;
}
