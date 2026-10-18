# Everyday simplicity and advanced workflows

The four primary destinations remain Calendar, Today, Patterns and More.
Patterns use two steps: sequence, then start/repetition. Controls for removing
or moving a pattern day appear only after selecting that day. Existing
occurrence overrides stay in place by default; replacement is advanced.

More provides one home for Sharing, Rosters, Shift types, Insights, Settings,
Data and App/help. Settings opens a section directory rather than a long form.
Calendar styles have Simple/Detailed presets plus individual custom controls.
Import/export is separate from advanced calendar editing. Bulk copy/move/repeat
and range selection remain available behind disclosures. Today always displays
today's scheduled status, with active overnight work retained until it ends.

Imported definitions are retained without rewriting history. Palettes favour
already-used definitions over unused starter definitions with the same name.
All definitions remain accessible from Shift types. Short cell labels are
optional and do not change full titles or notes.

## Sharing contract

A nullable `roster_id` on members/invites means whole-calendar access. A value
means only that roster. Each account has one membership scope per calendar,
which can be replaced by its owner. The share form defaults to the active roster
and view-only permission. Whole-calendar access includes future rosters.
Existing members and invitations retain whole-calendar access after migration.

Invitations are email-bound, expire after seven days and are single use. Creating
a replacement invitation revokes previous pending invitations for that recipient.
Permission changes revoke outstanding links, and omitted scope on legacy
permission-only requests preserves the existing membership scope. The invitation
review endpoint exposes only scope names to the invited authenticated account.

API snapshots filter records, definitions, preferences and audit titles for
roster-scoped members. Server and offline-client mutation guards reject foreign
IDs, moved records, settings, roster administration and shared-type changes.
Roster editors can create definitions scoped to their roster. Full-calendar
validation prevents these types being used by another roster. Realtime checks
current membership repeatedly; revoked access cannot fetch new snapshots.
Previously downloaded offline data cannot be remotely erased while a device
remains offline. Private events and author-only notes retain their protections.

## Verification

TypeScript, engine/UI/PWA tests and built-Worker D1 API integration checks cover
scope filtering, foreign-ID attacks, replacement links, scope-preserving role
changes, custom shift definitions, private notes, revoked sharing, implicit
primary rosters, active overnight work and roster data preservation.
Physical-device touch, native share sheets and OS-level installation still need
verification on actual iPhone and Android devices. Push delivery remains pending.


## Discoverable controls, version 28

Sharing shows roster scopes and view/edit permissions as named visible choices, with an invitation summary before preparation. Invitation security and private-note filtering remain unchanged.

Roster creation asks for a person/job name and colour, then offers schedule setup. Comparison has a dedicated selection sheet with a Show comparison action. The roster list exposes Name, colour & delete, and deleted rosters expose restore. Names and visibility descriptions reflect single-roster access.

New patterns offer familiar rhythms or a custom builder, default to continuous repetition, and show dated first-cycle previews directly. Saved patterns retain their original repetition settings. Explicit counts and end dates remain in the visible Repeat selector. Creating a pattern through the chooser exits the chooser on successful application.

Shift names, colours, emoji and kind remain visible. Abbreviations generate automatically, with a named appearance group for manual changes. Working times appear for working types; optional non-working times remain available in the named duration group. Breaks, location, pay and reminder preferences have descriptive group labels. Reminder preferences do not imply working closed-app notification delivery.

Entry privacy uses Only me / People with access choices separately for the entry and its notes. Existing privacy values are preserved; short cell labels and recurrence are directly visible. Other groups state their capabilities in their labels, and calendar Tools and pattern Edit actions have text labels.

Browser preview and physical device testing were unavailable for this release. Type checking, component rendering, logic, access-control, navigation and offline tests cover the implemented flows; real-device interaction testing remains outstanding.
