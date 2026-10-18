# Shiftly feature parity and acceptance audit

Audit date: 8 October 2026. Source code implements capabilities listed below; integration and device verification are recorded separately. This is an initial working release, not yet a feature-complete replacement for the two competitor applications.

Sources: https://support.ebisu-soft.com/hc/en-us/categories/360000909792-Shift-Work-Calendar-for-iPhone and https://apps.apple.com/ie/app/work-shift-calendar-shifter/id1523513035 . These describe capabilities, not proprietary code or UI assets. No competitor assets were used.

| Feature | Our implementation | Competitor equivalent | Status | Improvement / remaining work |
|---|---|---|---|---|
| Monthly, weekly, agenda, year | Responsive views and selected day inspector | Shifter monthly/annual | Implemented | Desktop inspector; mobile sheet |
| Calendar navigation | Today, swipe, month picker | Both basic calendar navigation | Partial | Mini date navigator and week numbers pending |
| Custom shifts | Colour, text colour, emoji, abbreviation, hours, breaks, location, pay | Both shift configuration | Implemented | Shared definitions update linked cells |
| Deeper styling | Density, labels, times, icons, rounded cells, solid/soft/outline, opacity | Shifter visual configuration | Partial | Gradients, patterns, borders and palettes still limited |
| Rich day markers | Shift plus multiple emojis and event detail | Shifter date icons / notes | Implemented | Multiple recurring personal events |
| Visual patterns | Reorderable cycle, once/X/until/forever, blank days | Both rotations | Implemented | Lazy rule expansion makes ×100 constant-size storage |
| Pattern library | Templates, rename, duplicate, removal | Both shift plans | Partial | Favourites and pattern import/export pending |
| Occurrence editing | Individual date overrides | Both pattern editing | Implemented | Overrides survive definition changes |
| Edit future pattern | Original pattern editor and date-forward split | Both pattern changes | Implemented | Rule split from selected occurrence preserves earlier dates |
| Fast entry | Paint taps, multiselect, full month/weekends, week copy, clipboard | Shifter paint/edit mode | Partial | Drag painting, month duplication and true drag painting pending |
| Live sharing | Roles, email-bound invite links, expiry, revocation, SSE revisions | Shifter export sharing; Shift Work Calendar shared shifts | Backend implemented | External sharing blocked by owner-private hosting; second-account QA pending |
| Private notes | Private events; author filtering | Both notes | Partial | Granular event/notes permission surface needs expansion |
| Together view | Authorized roster overlay and both-off / both-working comparison | Shifter calendar comparison | Partial | Shared free-evening/weekend interval analysis pending |
| Notification delivery | Reminder preference, service worker push handler | Both alarms | Blocked | VAPID/APNs and scheduling worker not configured |
| Native widgets | Architecture plan only | Shifter weekly/monthly widgets | Pending | Requires WidgetKit native target |
| Apple Calendar | Timed ICS export | Shifter Google export; Shift Work Calendar Google sync | Partial | EventKit permission flow and two-way reconciliation pending |
| ICS import/export | Timed shift export, bounded import, stable IDs | Calendar import/export | Implemented | Complex recurrence rejected explicitly; note inclusion optional |
| PDF / printing | Browser print and PDF save | Shifter monthly/annual sharing | Implemented | Image export pending |
| Notes | Text, URLs, location, privacy | Both notes; Shifter image notes | Partial | Checklist and attachment storage pending |
| Statistics | Working time, night/weekend counts, streak, pay estimate | Shifter hours / earnings | Partial | Overtime/allowances and richer leave balances pending |
| Pay | Hourly default and per-shift rate | Shifter income, overtime, early exit | Partial | Split shifts, allowances and early-exit controls pending |
| Multi-job | Separate calendars, shifts and patterns | Shifter up to 10 calendars | Implemented | Unlimited calendar records; combined view pending |
| Search | Current month shifts plus full event/notes search | Shifter icon search | Partial | All-date and natural language filters pending |
| Undo / redo | Session inverse operations, cloud audit | Shifter copy/cut/paste | Implemented | Persistent restore-history UI pending |
| Offline | IndexedDB snapshots/outbox, standalone cached shell | Competitor local storage | Implemented | Network reconnection and device QA pending |
| Cloud persistence | D1 records with indexed calendar/record keys | Both backups / sync features | Implemented | Server-side auth and revision guards |
| Authentication | ChatGPT-hosted auth; guest calendar locally | Platform accounts | Partial | Apple/Google/email providers not configured |
| Biometric lock | Not present | Platform-dependent | Pending | Native LocalAuthentication target |
| Backup / restore | JSON export and record import | Both backup / restore | Implemented | Restore is merge by ID, not exact deletion replacement |
| Public holidays | Manual event calendar possible | Both holiday display | Partial | Regional providers not integrated |
| Recurrence | Daily/weekly/monthly/yearly, until date | Both notes / recurrence | Partial | Every-X and selected-weekdays pending |
| Accessibility | Labels, keyboard focus, reduced motion, day text labels | Varies by competitor | Partial | Screen-reader device QA and 200% zoom inspection pending |
| iPhone safe areas | Safe-area top/bottom, bottom nav, modal max height | Native iPhone | Implemented | Physical iPhone / VoiceOver QA pending |
| >24h / split shifts | Engine supports explicit day span | Shift Work Calendar >24h; Shifter split shifts | Partial | Editor day-span implemented; split-shift UX pending |
| Account / calendar deletion | Not yet exposed | Both data management | Pending | Delete/restore and account erasure workflow |

## Non-negotiable scenarios

A: automated engine test passes for 800 days from 1 November 2026.
B: automated model test passes for a night shift and car-service marker on the same date.
C: backend sharing primitives implemented, but end-to-end partner access is not accepted until audience configuration and two-account test pass.
D: not accepted. Closed-app push delivery is not enabled.
E: automated test passes for definition colour propagation.

## QA evidence

20 automated engine/state tests passed: month/year crossings, leap years, ×100 boundary, forever rules, occurrence overrides, DST in Malta/New York, long shifts, unpaid breaks, recurring event bounds, stable ICS identity, timezone import, invalid data, statistics and definition propagation. Local D1 API tests passed for authentication, cross-user denial, viewer write denial, private event and audit filtering, idempotent retries, optimistic conflicts, email-bound invitation redemption, and access revocation. TypeScript and production Worker builds are validated separately during publication. Browser/device screenshots are not available in this runtime because the required browser-control skill is absent; layout approval must not be inferred from source-only checks.

Additional defects found and fixed on 9 October are recorded in QA_REVIEW.md; device visual QA is still pending.
