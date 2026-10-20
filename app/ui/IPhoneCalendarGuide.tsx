'use client';

export default function IPhoneCalendarGuide(){
 return <>
  <details className="disclosure"><summary>Manual iPhone setup</summary>
   <p className="hint">If you are on the Calendar settings screen showing Time Zone Override, Sync and Default Calendar, scroll towards the top to find Calendar Accounts. The Sync row does not connect a new account.</p>
   <ol>
    <li>Keep Shiftly’s server address, username and password ready above. Save the password in your password manager. If you closed Shiftly without saving it, use Replace password.</li>
    <li>Open iPhone Settings → Apps → Calendar → Calendar Accounts → Add Account → Add Other Account → Add CalDAV Account. Some iOS versions label this Other.</li>
    <li>Enter the full Server address from Shiftly, its Username and its Password. These are the Shiftly calendar credentials, rather than your Apple or Google password. Set Description to Shiftly if that field is shown, then tap Next.</li>
    <li>If Advanced Settings shows an Account URL, use the full Shiftly server address there, including the /api/caldav/ path. For the live app, keep Use SSL on and use port 443 if those options appear. Do not accept a connection without SSL.</li>
    <li>Keep Calendars enabled if asked, then Save. Open the Apple Calendar app → Calendars and select the single calendar named Shiftly. Duty, overtime, leave and appointments appear together, and Rest and Off are optional.</li>
   </ol>
   <p className="hint">Use one connection for this roster. If you already added the read-only Shiftly subscription, remove that subscription before adding the two-way account so the same shifts do not appear twice.</p>
  </details>
  <details className="disclosure"><summary>More iPhone tips · display, notes &amp; checking sync</summary>
  <details className="disclosure"><summary>Recommended iPhone Calendar settings</summary>
   <dl className="iphone-preferences">
    <div><dt>Time Zone Override → Off</dt><dd>Keep this off for normal use in Malta, and check that this roster’s timezone in Shiftly is Europe/Malta. Apple Calendar displays timed events in the phone’s local timezone. If you travel, displayed times can change; an override changes the display timezone across Calendar.</dd></div>
    <div><dt>Sync → All Events</dt><dd>Your current setting is suitable for viewing older entries. This controls the calendar history kept on the phone, rather than how often changes are checked. Fetch New Data controls the update schedule.</dd></div>
    <div><dt>Default Calendar → Home</dt><dd>Keep Home for everyday personal events. When creating a work entry in Apple Calendar, choose Shiftly to add an entry to your roster. Add overtime and leave in Shiftly to choose their type; they appear in the same Apple calendar automatically. When adding directly in Apple Calendar, start the title with OT, Overtime or Leave to recognise a new entry’s type. Manage repeating work patterns and shift-type changes in Shiftly. Events added to Home do not sync into your roster.</dd></div>
    <div><dt>Duration for New Events → 1 hour</dt><dd>This can stay as it is because synced shifts carry their own start and end times. For a new overnight overtime entry, set both times and move its end date to the following morning.</dd></div>
    <div><dt>Start Week On → Monday</dt><dd>Your current choice is suitable. Week Numbers, Alternative Calendars, Week View Starts On Today, invite declines and location suggestions are personal preferences and are not required for Shiftly sync.</dd></div>
    <div><dt>Default Alert Times</dt><dd>Choose the alerts you want in Apple Calendar. The calendar connection does not require enabling location suggestions or extra alerts.</dd></div>
   </dl>
   <p className="hint">For lower-frequency background checks, see Battery and update timing below. Shiftly cannot change iPhone Settings for you.</p>
  </details>
  <details className="disclosure"><summary>Make Apple Calendar look its best</summary><p className="hint">In Apple Calendar’s month view, tap the view button beside Search. Details shows shift names in the grid, while List gives more space to the selected day. Keep Rest and Off hidden for a cleaner month.</p><p className="hint">Open Calendar → Calendars and pull down to refresh. After the simpler layout is applied, keep Shiftly selected. The old colour groups are retired automatically, while your saved roster stays in place.</p><p className="hint">To shorten the account name shown in your screenshot, open iPhone Settings → Apps → Calendar → Calendar Accounts → your Shiftly account and change Description to Shiftly. The address and password stay the same.</p></details>
  <details className="disclosure"><summary>Notes in Apple Calendar</summary><p className="hint">Enable Include notes in Apple Calendar above to see event notes when you open an entry in Apple Calendar. Notes then update in both directions. Notes marked private in Shiftly are excluded.</p><p className="hint">If you switch this off, Shiftly keeps your notes and removes them from the synced entries when Apple refreshes. With notes off, editing an Apple event does not change its Shiftly notes.</p></details>
  <details className="disclosure"><summary>Check your first sync</summary>
   <ol><li>After the account appears in Apple Calendar, compare a known Day and Night shift with Shiftly. A Night shift should end at 07:00 the next morning.</li><li>Use an optional test entry in Shiftly, wait for Apple Calendar to refresh, then check its date and time.</li><li>For two-way confirmation, edit that test entry’s title in Apple Calendar, keeping it in its existing Shiftly calendar, then reopen Shiftly to check the result.</li></ol>
   <p className="hint">Keep one connection per roster and avoid importing a Shiftly ICS export into Apple Calendar alongside the live account, because a separate import creates independent copies. Use Shiftly for repeating entries, moving roster shifts to another date, and changing the roster pattern. Unsupported Apple edits are rejected rather than changing the pattern or shortening a multi-day entry.</p>
   <p className="hint">If verification fails while adding the account, check the full address and credentials first. After Replace password, update the password on every device using that Shiftly account. Hiding the calendar only hides its display; it does not disconnect sync.</p>
  </details>
  </details>
 </>;
}
