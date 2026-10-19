# Shiftly implementation contract

Original calendar-first design: ink typography, cool white surfaces, cobalt controls, colour-coded shift bands. Desktop has calendar plus day inspector; phones retain the complete seven-column month with a bottom navigation and safe-area sheet.

Navigation: Calendar (month/week/agenda/year), Today, Patterns, Insights, Settings. Reusable month grid, shift badges, day sheet, shift editor, pattern builder, sharing manager and statistics panels.

Data: calendars own normalized shift types, occurrences, events and patterns. Each record has a stable UUID and calendar foreign key. Membership and invitations are separate, with roles owner/editor/viewer; notes have author ownership and explicit visibility. Preferences, pay and leave configuration are calendar settings. Audit records capture operations. Calendar revisions and operation identifiers support atomic optimistic locking and idempotent retry.

Auth: verified Google sessions through Supabase, checked on every API request. Ownership and membership authorize calendar access; private records and notes retain per-author restrictions. The frontend uses PKCE and the backend rejects unverified tokens.

Offline: IndexedDB cached snapshot and mutation outbox partitioned by calendar and authenticated user. Mutation retries use stable operation IDs. A revision mismatch preserves the queued changes and asks the user to resolve before overwriting. Offline app-shell service worker caches static application assets, never authenticated API responses. Reconnection flushes the outbox sequentially.

Realtime: authenticated Server Sent Events stream calendar revisions; every connection and each emission rechecks membership. Clients reload on a revision event. Deploy verification must include two accounts before marking sharing complete.

Patterns: lazy rule expansion by UTC civil-day arithmetic, separate per-date overrides. X100 stores one rule and renders only requested date windows. Forever rules are bounded by query windows. No giant roster JSON. Pattern edits use occurrence override or rule split from a selected day.

Notifications: persisted per-event reminder configuration and in-app reminder inbox. Closed-app push requires VAPID/APNs credentials and a scheduled delivery worker, not configured in this build. Native WidgetKit, Live Activities, EventKit and biometric lock require a native iOS target and entitlements; these are roadmap integrations, not implemented capabilities.

Tokens: spacing 4/8/12/16/24/32/48, radii 8/12/20, controls 44px minimum, 160ms interaction transitions, reduced-motion preference. Dark surfaces are navy with brighter semantic shift colours. All shifts include labels and icons in addition to colour.

State: React view state and a typed calendar snapshot; authoritative D1 database; IndexedDB recovery outbox. Export uses stable ICS UIDs. Notes excluded from export unless explicitly selected. Statistics calculate actual elapsed shift time in the calendar IANA timezone including DST, with break deductions.

Acceptance limits: native integrations, push delivery, attachment storage, biometric auth, external OAuth and verified multi-user sharing remain blocked pending configuration or native implementation. Feature parity is not claimed until those pass.

### Named rosters within a calendar
A calendar is the invitation and permission boundary. Each calendar can contain multiple named rosters with identity colours. Roster metadata is persisted as separate `calendar_records` rows with kind `roster`; patterns, occurrences and events reference a validated `rosterId`. Existing records without a roster ID belong to the stable `main` roster, preserving earlier data without a destructive migration. Additional roster occurrence IDs are `rosterId:date`, so two people's edits on the same date cannot overwrite each other. Shared shift definitions and calendar preferences remain calendar-wide, while Today, patterns, events, statistics and ICS use the active roster. Full backup retains all rosters. The comparison view reads multiple roster snapshots from the same live calendar subscription.
Calendar authorization has no global app-owner bypass: being the distributor of the app does not grant access to another user's calendar through the application. Hosting/database administration remains a separate infrastructure capability.
