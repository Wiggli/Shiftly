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

## Continuing review

Keep reviewing navigation and entry speed, pattern changes/end dates, sharing/revocation, conflict recovery, backup/restore, error states, performance and code fragility as development proceeds. Add concrete findings and evidence here rather than declaring every possible state tested. Do not add recurring monitoring.
