# Shiftly product audit

Living checklist under PRODUCT_STANDARD.md. Update evidence and remaining limitations with each meaningful release. A checked row records a specific inspection, not a guarantee that no future defect exists.

## Baseline, 20 October 2026

- Existing production: GitHub Pages and Supabase; Google photo restoration deployed in commit 9c9b718. No real roster mutations used for QA.
- Existing regression coverage: 118 application tests; Pages/offline and built session tests; CalDAV, edit-sync and security/API fixtures; 80 phone browser checks in Chromium/WebKit, portrait/landscape, with captured screenshots.
- Previous visual coverage: Month, Week, Today, patterns, editing, quick entries, search, settings, account/help, onboarding, comparison, empty/read-only and long-text samples in light/dark modes.
- Physical iPhone keyboard, Safari chrome, actual installed safe areas and VoiceOver remain device checks. Cloud browser layouts do not certify these.

## Current audit pass

| Area | Inspection and action | Verification |
| --- | --- | --- |
| Auth/loading | Temporary account failures must not silently switch into a guest calendar; bound initial account loading and provide retry. | Implemented; application and phone regressions passed |
| Calendar and Week | Preserve the seven-day design; make the hours action open the same weekly range it summarises. Label planned hours accurately and show timed overtime separately; include leave annotations in leave-date counts without rewriting duties or pay. | Implemented; application and phone regressions passed |
| Patterns | Replace unconditional Applied labels with actual current/upcoming/finished status, date bounds, cycle position and next cycle; explain manual overrides. | Implemented; application and phone regressions passed |
| Accounts | Deployed Google photo mapping retained; image errors use initials and reset on a changed photo URL. | Source and built-session checks passed |
| Editing and entries | Paint/select/copy/paste/repeat/undo and separate overtime/leave/notes paths reviewed; added phone regression for a manual override surviving a pattern end date. | Engine, edit-sync and manual-override phone checks passed |
| Apple Calendar | Stable UIDs, revision/ETag paths, notes privacy and visible Notes sync control inspected. | CalDAV repeat/update/delete, DST, atomic edit and note privacy fixtures passed |
| PWA/offline | Safe activation blocks drafts/unsynced edits; manual update results cover current/new/failed/downloading states; account recovery keeps existing app mounted on transient errors. | Update, Pages/offline, account boundary and timeout tests passed |
| iPhone/accessibility | Existing Week layout visually reviewed; sheet focus and reduced-motion paths inspected. Form inputs now use explicit text labels so select options do not alter their accessible names. Added four-row month coverage alongside existing five/six-row tests. | 100 Chromium/WebKit phone checks passed; changed screenshots inspected in both orientations; physical device checks still required |
| Delivery | Required checks and terminal Publish Shiftly result, then live commit/assets verification. | Enforced by Publish Shiftly; completion requires a matching live release |

Local validation: 125 application tests, typecheck, production build, 8 Pages/session tests, CalDAV, edit-sync, HTTP/API/security and live-verifier fixtures passed. Added startup module recovery coverage so failed loading offers retry instead of a blank screen. The complete 100-check phone suite passed in [Publish Shiftly run 39391237544](https://github.com/Wiggli/Shiftly/actions/runs/39391237544), and its portrait/landscape screenshots were inspected. Visual review then corrected the misleading ready message when ending an existing pattern; the same regression now requires Pattern updated. Subsequent changes remain subject to the complete release gate. [PR #2](https://github.com/Wiggli/Shiftly/pull/2) records the final merge and publication evidence; verify the successful main publish result and live version before calling the release complete.

## 21 October 2026: adaptive iPhone calendar density pass

- Added explicit calendar typography roles on phone for month title, weekday label, date number, planned duty and secondary annotations, with deliberately different density for four-, five- and six-row months rather than uniformly shrinking the calendar.
- Five-row months now use the available vertical space more generously, while six-row months reduce cell padding, duty size and inspector height enough to protect the complete-month-on-one-screen requirement. Long duties retain ellipsis rules and receive a bounded compact size in six-row months.
- The selected-date preview now behaves more like an adaptive inspector: quiet dates remain shorter, while dates containing overtime, leave, notes or other annotations can use more vertical space. The existing quick OT, Leave and Note actions remain immediately available.
- Reduced calendar tab-bar chrome while retaining 44px minimum calendar tab targets and safe-area padding. Selection now adds underline/weight treatment as a non-colour cue in addition to the existing outline.
- Added `tests/mobile/adaptive-calendar.spec.ts`, covering October 2026 as a five-row month and August 2026 as a six-row month on every configured Chromium/WebKit iPhone orientation, plus quiet versus busy selected-date inspector behaviour, no page scrolling, bottom-nav containment and minimum tab target height. Screenshots are attached by the test for visual inspection.
- The new regression exposed an existing compact-landscape rule that reduced bottom navigation targets to 38px. The production CSS now restores 44px targets in landscape while keeping the compact visual treatment. A second test refinement distinguishes true portrait truncation from wide-landscape content that legitimately fits without overflow.
- This pass is intentionally presentation-only and does not alter Supabase records, authentication, shift assignment semantics, patterns, offline mutation handling, Apple Calendar identities or real roster data.

Verification status: [Publish Shiftly run 39522895588](https://github.com/Wiggli/Shiftly/actions/runs/39522895588) passed typecheck, 125 application tests, CalDAV, edit-sync, API/security checks, production build, Pages/session/profile checks, release-verifier fixtures and all 116 Chromium/WebKit mobile checks across the 440 x 956 portrait and 956 x 440 landscape presets. The generated iPhone artifact was visually inspected across adaptive five- and six-row calendar states, busy selected-date content, bottom navigation and neighbouring Today, Patterns, More, settings, sharing and editing surfaces. No full-month clipping or bottom-gap regression was observed. Physical iPhone safe-area behaviour, keyboard interaction, Safari chrome and VoiceOver remain device checks. Merge and live publication verification are still required before this pass is called released.

## Continuing review

Keep reviewing navigation and entry speed, pattern changes/end dates, sharing/revocation, conflict recovery, backup/restore, error states, performance and code fragility as development proceeds. Add concrete findings and evidence here rather than declaring every possible state tested. Do not add recurring monitoring.

## Automatic iPhone account naming

New connections can download a minimal CalDAV configuration profile from Calendar sync. It supplies the account description Shiftly, secure Supabase host, username and principal URL; it never embeds a password or session token. Existing installed accounts show one-time rename guidance because iOS does not permit the app to rewrite their local descriptions remotely. Keep one connection per roster to avoid duplicate subscriptions.

The implementation follows Apple's [CalDAV payload schema](https://github.com/apple/device-management/blob/release/mdm/profiles/com.apple.caldav.account.yaml) and [manual profile installation instructions](https://support.apple.com/en-us/102400). iOS still requires review, installation and the calendar password; physical-device installation is not certified by browser tests.

Validation: typecheck, production build, 125 application tests, 11 Pages/session/profile tests, CalDAV, edit-sync and API/security fixtures passed locally. Added actual-component phone coverage for light/dark setup and rename guidance, XML fields and password-free downloads in Chromium/WebKit portrait and landscape. Merge and release remain gated on the complete phone suite and live build verification.

Initial phone validation passed 104 checks and exposed a test assumption: WebKit hands Apple's profile MIME type to its native handler instead of emitting Playwright's download event. The revised check verifies its actual navigation response, MIME and attachment filename; Chromium additionally validates saved file bytes. Native iOS installation remains a device check.

## 22 October 2026: calendar-first simplicity

Audited setup, guide, calendar phone toolbar and selected date preview, Schedule,
sequence editor, custom shifts, More, day actions, roster management and sync
entry points. The concept mapping and retained capabilities are documented in
SIMPLE_SCHEDULE.md. No account/database migration or auth/sync rewrite is used.

- Calendar opens directly without a mandatory tutorial; an empty phone calendar
  shows No schedule yet with Set up my schedule, within the fitted calendar frame.
- Setup asks how the user works, then their sequence/weekly days, then a start
  date. Existing roster identity is inferred. Common shifts, optional custom
  definitions and time editing do not require separate management screens.
- Calendar Add consistently offers Shift, Overtime, Leave and Note, with advanced
  creation secondary. Patterns is presented as Schedule in navigation; existing
  data and advanced bulk, pattern and sharing tools remain available.
- Day changes explicitly affect one day. Schedule edits default to future-only
  splitting; editing the historical source is a separate explicit option.
- Stop repeating preserves historical generated duties, individual edits and
  annotations rather than deleting their underlying pattern record.

Verification in progress: local application, typecheck, production PWA/backend
build and Pages tests; CI phone validation and screenshot inspection are required
before publication. Local test browsers could not be downloaded in this runtime,
and its separate browser cannot reach the local preview server. Do not describe
these environment limitations as passed phone checks. Physical iPhone keyboard,
Safari chrome, safe areas and VoiceOver remain device checks.

Phone evidence: [CI run 39759406269](https://github.com/Wiggli/Shiftly/actions/runs/39759406269)
passed all backend/build/PWA/security gates and 140/148 phone checks, including
all new setup, custom shift, future edit, individual edit, small-phone and
history-preserving stop cases. The eight failed checks repeated two findings
across engines/orientations: an old empty-sequence warning did not clear when a
day was added, and an existing test selected two different More options labels.
The warning now clears on correcting the sequence; the test now scopes its
selection to the active schedule sheet. Portrait/landscape artifacts were
inspected for Calendar, empty setup, sequence/date steps, completed DDNN OO,
small phones, neighbouring More/settings and light/dark surfaces. This review
also made the six-day sequence fit one row on the main phone size and reused
the sticky form action area so Continue stays visible in taller setup forms.

Final CI, merge and live-release evidence is maintained in
[PR #9](https://github.com/Wiggli/Shiftly/pull/9). Passing browser tests does not
certify physical iPhone safe areas, keyboard behaviour, Safari chrome or VoiceOver.

## 22 October 2026: shared schedule ownership and live access

- Audited original-object membership, scoped filtering, email-bound invitations, server authorization, revision transactions, live streams, offline queues, account cleanup and deployed private-schema grants. No production roster mutations used for QA.
- Replaced mixed container/roster switching with owner-aware My schedules and Shared with me groups. Recipient headers and entry sheets identify the owner and View only/Can edit. Sharing now exposes the access list directly, retains in-place permission changes, defaults to one schedule, fixes pending invitation URLs under Pages, retains invitations through Google sign-in, and confirms acceptance before opening the shared schedule.
- Whole-space editors no longer gain schedule archive/identity or restore-backup rights. New owner metadata is additive; existing IDs, members, schedule records, private notes and Apple Calendar paths are preserved. See SHARED_SCHEDULES.md for the authorization and migration model.
- Live messages include role/scope and explicit revocation. Catalog reconciliation runs even with pending edits, prunes revoked or narrowed downloads, and returns recipients to their own schedule after revocation. Permission changes preserve an authorized backup draft where appropriate rather than replaying a stale grant. Offline devices reconcile when they reconnect; remote erasure while disconnected cannot be guaranteed.
- Added disposable three-account API and multi-context browser coverage. Local validation passed: 136 application checks, typecheck, production/offline build, three-user sharing, API/privacy, CalDAV, edit-sync and 12 Pages/session checks. Publication requires the full CI phone suite, screenshot inspection and matching live release verification. Physical device validation remains outstanding.
