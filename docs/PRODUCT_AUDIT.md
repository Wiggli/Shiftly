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
| Auth/loading | Temporary account failures must not silently switch into a guest calendar; bound initial account loading and provide retry. | In progress |
| Calendar and Week | Preserve the seven-day design; make the hours action open the same weekly range it summarises. | In progress |
| Patterns | Replace unconditional Applied labels with actual current/upcoming/finished status, date bounds, cycle position and next cycle; explain manual overrides. | In progress |
| Accounts | Keep the deployed Google photo mapping; review image failure/recovery behaviour. | In progress |
| Editing and entries | Existing paint/select/copy/paste/repeat/undo and separate overtime/leave/notes paths reviewed; add end-to-end regression for manual overrides. | In progress |
| Apple Calendar | Inspect stable UIDs, revision/ETag behaviour, privacy and Include notes discoverability; rerun repeat/update/delete fixtures. | In progress |
| PWA/offline | Inspect safe activation, explicit manual update results and retained local data; test transient errors. | In progress |
| iPhone/accessibility | Inspect live phone samples, focus, contrast, light/dark and both orientations; capture changed screens. | In progress |
| Delivery | Required checks and terminal Publish Shiftly result, then live commit/assets verification. | Pending |

## Continuing review

Keep reviewing navigation and entry speed, pattern changes/end dates, sharing/revocation, conflict recovery, backup/restore, error states, performance and code fragility as development proceeds. Add concrete findings and evidence here rather than declaring every possible state tested. Do not add recurring monitoring.
