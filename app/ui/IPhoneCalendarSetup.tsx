import {calendarProfileURL} from '../../lib/caldav-profile';

export default function IPhoneCalendarSetup({address}:{address:string}){
 let url:string;try{url=calendarProfileURL(address);}catch{return null;}
 return <section className="iphone-calendar-setup" aria-label="iPhone calendar setup">
  <h3>Show your account as Shiftly</h3>
  <details className="disclosure"><summary>Already connected? Rename your existing account</summary><p className="hint">In iPhone Settings → Apps → Calendar → Calendar Accounts, open your existing account, open Account Settings if shown, and change Description to Shiftly. This keeps your current connection and avoids adding the roster twice.</p><p className="hint">An account already installed on your iPhone must be renamed there; Shiftly cannot change its description remotely.</p></details>
  <p className="hint">For a new connection, this setup file fills in the name Shiftly, server and username automatically.</p>
  <a className="primary full" href={url} download="Shiftly.mobileconfig" target="_top" referrerPolicy="no-referrer">Download iPhone setup</a>
  <p className="hint">Open this in Safari. The file contains no password; keep your saved Shiftly calendar password ready.</p>
  <ol><li>After downloading, open iPhone Settings → Profile Downloaded.</li><li>Review the Shiftly calendar account, tap Install and enter your Shiftly calendar password when asked.</li><li>Open Apple Calendar → Calendars and enable Shiftly.</li></ol>
  <p className="small muted">Install one connection per roster. If profile installation is unavailable, use manual iPhone setup below and set Description to Shiftly.</p>
 </section>;
}
