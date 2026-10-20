const accountPath=/^(\/functions\/v1\/shiftly-api)?\/api\/caldav\/(s[a-f0-9]{24})\/$/;
const xml=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));

function accountAddress(address:string){
 const url=new URL(address),match=accountPath.exec(url.pathname);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!match)throw Error('Choose a valid secure Shiftly calendar connection.');
 return {url,prefix:match[1]||'',username:match[2]};
}
export function calendarProfileURL(address:string){
 const {url,prefix,username}=accountAddress(address);
 return new URL(prefix+'/setup/caldav/'+username+'.mobileconfig',url.origin).href;
}
async function profileUUID(name:string){
 // RFC 4122 UUID v5 with the DNS namespace keeps replacement profiles stable.
 const namespace=Uint8Array.from('6ba7b8109dad11d180b400c04fd430c8'.match(/../g)!,pair=>parseInt(pair,16));
 const encoded=new TextEncoder().encode(name),bytes=new Uint8Array(namespace.length+encoded.length);bytes.set(namespace);bytes.set(encoded,namespace.length);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-1',bytes)).slice(0,16);hash[6]=(hash[6]&15)|80;hash[8]=(hash[8]&63)|128;
 const hex=Array.from(hash,byte=>byte.toString(16).padStart(2,'0')).join('');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-').toUpperCase();
}
export async function calendarProfile(address:string){
 const {url,username}=accountAddress(address),identifier='app.shiftly.caldav.'+username;
 const field=(key:string,value:string)=>`<key>${key}</key><string>${xml(value)}</string>`;
 const common=(type:string,id:string,uuid:string)=>field('PayloadType',type)+field('PayloadIdentifier',id)+field('PayloadUUID',uuid)+'<key>PayloadVersion</key><integer>1</integer>'+field('PayloadDisplayName','Shiftly');
 const profile=common('Configuration',identifier,await profileUUID(address+'#profile'))+field('PayloadDescription','Adds your Shiftly calendar account. Enter your Shiftly calendar password when iPhone asks.')+field('PayloadOrganization','Shiftly')+'<key>PayloadRemovalDisallowed</key><false/>';
 const account=common('com.apple.caldav.account',identifier+'.account',await profileUUID(address+'#account'))+field('CalDAVAccountDescription','Shiftly')+field('CalDAVHostName',url.hostname)+field('CalDAVUsername',username)+field('CalDAVPrincipalURL',new URL('principal/',url).href)+'<key>CalDAVPort</key><integer>'+(url.port||'443')+'</integer><key>CalDAVUseSSL</key><true/>';
 // Apple advises including passwords only in encrypted profiles. This download
 // contains neither a password nor a session token; iOS prompts during setup.
 return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>'+profile+'<key>PayloadContent</key><array><dict>'+account+'</dict></array></dict></plist>\n';
}
