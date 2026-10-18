# Shiftly review, 9 October 2026

Reviewed the deployed version 1 source and corrected the following defects:

- Additional calendars had no default shift types, making template application unusable. New calendars now seed Day, Night, Off and Annual Leave atomically.
- Today included finished shifts and missed an ongoing shift starting the previous evening. It now checks actual timezone-aware start/end instants and updates each minute; recurring upcoming events are also expanded.
- Empty or reversed statistics ranges could crash, and training hours were excluded. Invalid ranges now return a safe empty result with validation feedback, and training is counted as work.
- Explicit overnight spans could produce zero-length or backwards shifts. Both time fields and sensible spans are now validated for guest, offline and cloud edits. Leave/off category selection clears work times.
- DST gap/repeated-hour timestamps were ambiguous. Skipped clock times move forward by the gap and repeated times choose the earlier occurrence.
- Week navigation moved months. Week arrows now move seven days and the selected date anchors the seven-day view.
- Date jumping and undo/redo were unavailable on small screens. Calendar tools now expose them; the narrowest month grid receives more width.
- Saving invalid records could leave a poisoned outbox, while async reloads could overwrite local edits. Validation precedes optimistic updates, load responses are invalidated by new edits, conflicts/rejections block further editing pending backup/reload, and calendar commands wait for queued changes.
- Record-kind ID collisions and dangling shift references were accepted. Both are rejected server-side, and date occurrence IDs must match their civil date.
- Private-note controls allowed another editor to propose note changes, and outstanding invitations could restore removed access. The editor disables another author's private-note controls, the backend preserves those notes, and removing membership revokes outstanding invitations for that email. Invitation redemption is conditional within the database batch.
- The offline shell used unchanged asset names without invalidating its cache. Its service-worker cache revision now derives from the built JS/CSS contents.
- Pattern drop events without a valid dragged day could corrupt the sequence, and duplicating a maximum-length shift name exceeded the limit. Both paths are bounded.
- First-calendar creation could race across devices. The default calendar uses an idempotent per-user key without rewriting existing calendars.

Verification: 20 automated engine/state tests, TypeScript checking and local Worker/D1 API regression tests. API tests cover authentication, viewer denial, private events/audit records, note preservation, outstanding-invite revocation, invalid references/settings, record collisions, idempotent retries and optimistic conflicts. Production packaging/deployment follows those checks.

UI confidence limit: this is a source and responsive-rule review, not an iPhone screenshot or VoiceOver sign-off. The required browser-control skill is unavailable in this environment, and physical iPhone QA is still outstanding. Push delivery, native widgets, external identity providers and external partner access remain the configuration/integration gaps documented in FEATURE_PARITY.md.

## Partner calendar collaboration
- Invitation UI defaults to Editor and explains shared roster, pattern and daily event access.
- Calendar owners can change an existing member between Viewer and Editor or remove access.
- Permission changes revoke pending invites for that email, preventing a stale editor invite from restoring higher privileges.
- New events default to shared on calendars with members or active invitations; notes default to author-private. Existing private events remain private.
- API integration tests cover partner-created patterns with 100 repetitions, daily shift overrides, shared events, private notes, role changes and SSE update delivery.
- External visitors require an email-specific app access grant in addition to accepting the calendar invitation. No external person has been granted access yet.

## Independent accounts and public app access
- The public app shell uses device-local guest data; cloud calendar APIs and live streams always require authenticated identity and calendar authorization.
- Users independently create private calendars and invite their own viewers/editors, without the original app owner's involvement.
- Invitation sign-in preserves its return URL, shared calendars display the user's permission, and sign-out clears the current account's cached calendars.
- Integration checks verify original owner/friend isolation, friend-to-spouse invitations, spouse edits, and anonymous API denial.
- Authentication remains dispatch-owned ChatGPT sign-in. Standalone email, Apple and Google identity providers are not configured on this hosting platform.

## Multiple rosters in one calendar
- Added named roster management, identity colours, active roster switching, monthly comparison markers and a Together comparison view with per-person daily detail.
- Existing schedules remain in `main`; each additional roster has independent pattern/event ownership and date override IDs.
- Unit checks cover independent same-date shifts, pattern resolution, per-roster statistics, legacy data compatibility, missing roster references and distinct ICS identifiers.
- API checks cover owner/editor roster creation and entry updates, viewer denial, referential integrity and the original app owner's inability to access a friend's calendar.
- Shift definitions are calendar-wide; invitations grant access to all shared entries across that calendar's rosters. Private event/note rules remain per author.
- Physical-device and browser visual verification remain pending; this release was verified through type checking, production build and logic/API integration tests.
