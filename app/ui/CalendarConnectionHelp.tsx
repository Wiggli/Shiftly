'use client';

export default function CalendarConnectionHelp({connected,busy,onDisconnect}:{connected:boolean;busy:boolean;onDisconnect:()=>void}){
 return <>
  <details className="disclosure"><summary>Battery and update timing</summary>
   <p className="hint">Apple Calendar checks for changes using iOS. Shiftly does not need to stay open for calendar sync, but any network syncing uses some battery. Battery use has not been measured on your iPhone.</p>
   <p className="hint">For fewer background checks, go to Settings → Apps → Calendar → Calendar Accounts → Fetch New Data. Under Fetch, choose Automatically. Apple downloads new data while the iPhone is charging and connected to Wi-Fi, so roster updates may take longer to appear.</p>
   <p className="hint">Fetch settings can also affect other accounts that use that schedule. Choose Manually for the Shiftly account if you prefer to refresh it yourself; this gives up automatic background updates.</p>
  </details>
  <details className="disclosure"><summary>Remove the Apple Calendar setup</summary>
   <p className="hint">Remove the connection as a whole instead of deleting its events one by one. Deleting an event inside the connected calendar can also change that date in Shiftly.</p>
   <ol><li>On your iPhone, go to Settings → Apps → Calendar → Calendar Accounts, select the Shiftly CalDAV account, then choose Delete Account. Remove the same Shiftly account from any other devices where you added it.</li><li>Return here and finish disconnecting to revoke its login details.</li></ol>
   <p className="hint">This removes the sync connection. Your Shiftly roster stays saved, and your other Apple calendars are unaffected. Shiftly cannot remove an iPhone account for you.</p>
   {connected?<button type="button" className="danger-button full" disabled={busy} onClick={onDisconnect}>{busy?'Disconnecting…':'Finish disconnecting Apple Calendar'}</button>:<p className="hint" role="status">No active Shiftly CalDAV login remains for this roster. If the account is still on your iPhone, remove it using step 1.</p>}
  </details>
 </>;
}
