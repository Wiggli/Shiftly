# Shiftly product standard

Andre's permanent development mandate, adopted 20 October 2026.

Shiftly should feel finished: a fast, simple, dependable iPhone shift calendar that a nurse can understand in two seconds and update in a few taps. The calendar is the centre of the product. This standard applies to current and future work and supplements AGENTS.md.

## Self-explanatory without onboarding

A user who skips every guide must still understand Calendar, Set up my schedule,
Add, editing a day, and where to change their normal schedule. Never repair a
confusing basic flow by requiring another tutorial. Ordinary setup asks how the
user works, their shifts/sequence and its starting date, with common shifts and
continuous repetition ready by default. Infer roster/container identity instead
of requiring names or assignments. Use one visually dominant next action in
empty/setup states and keep advanced management behind explicit options.

Everyday language is Calendar, Schedule, Shift, Overtime, Leave and Note.
Stored rosters, patterns, templates and recurrence machinery remain compatible
and available where needed, without becoming prerequisites for ordinary use.
Preserve historical duties when stopping or changing future repeating schedules.

## Ownership and priorities

Act as product owner, designer, frontend engineer and QA engineer. Inspect screens, components, interactions and states systematically; repair adjacent issues as they emerge instead of waiting for Andre to report them. Routine reversible improvements are authorised. Escalate only decisions that materially change the product or risk user data. Preserve accounts, user information, authentication, Supabase, roster data, shift definitions, patterns, overtime, leave, notes, offline edits and Apple Calendar integration. Avoid rebuilding or broad stylistic refactors.

Prioritise, in order: broken functionality and data integrity; calendar reliability; iPhone layout and safe areas; entry speed; calendar readability; Week; patterns; overtime and leave; Apple Calendar sync; accounts; PWA updates; loading performance; accessibility; visual polish; code cleanup.

## iPhone and visual quality

- Start with the iPhone 18 Pro Max preset: 440 × 956 portrait and 956 × 440 landscape CSS pixels. Check browser and installed PWA layouts, viewport height changes, reduced visual viewport, safe areas, keyboard, scroll, sticky/fixed controls, sheets and navigation. No unexplained top or bottom gaps, hidden actions or content behind the home indicator.
- Browser automation approximates layout, not physical iOS. State device-only limits honestly, including Dynamic Island, Safari chrome, keyboard, safe areas, display zoom and real touch behaviour.
- Use readable typography, clear hierarchy, consistent spacing, restrained borders, coherent radii, subtle depth, clear selected states and fluid feedback. Review light and dark modes independently. Avoid excessive cards, tiny controls, redundant text and decorative clutter.
- Aim for 44px touch targets for primary actions; retain semantic controls, VoiceOver labels, visible keyboard focus, contrast, text scaling and reduced motion. Critical information must not depend on colour alone.
- Keep four primary tabs unless a demonstrated simplification improves the product without hiding important functionality. Keep infrequent settings away from daily actions; use human language rather than implementation terms.

## Calendar and editing

- Keep the useful Month view on one phone screen without unnecessary vertical scrolling. Use clear shift labels and colours across usable cells, excellent contrast, a restrained Today marker and fast date navigation. Check four-, five- and six-row months, empty dates, multiple annotations and long labels.
- Design Week independently as a useful seven-day roster with duty names, real hours, overnight indication, overtime, leave and notes; use realistic data and meaningful week totals.
- Make Day, Night, Rest, Off and custom duties quick to assign. Overtime, annual/study/sick/custom leave and notes must remain separate annotations and preserve planned duties. Avoid duplicate information and make editing/deletion discoverable.
- Normal calendar mode stays clean. Dedicated Edit mode supports tap/paint, multi-select, copy, move, paste, clear, repeat, saved patterns, preview and undo. Remember useful defaults safely and avoid large forms for simple assignments.
- Explain whether a roster contains dated duties or linked patterns. For each pattern show its sequence, start, end or repetition, current status and next cycle where applicable. Explain how to change/end it and how individual edits override it. Never overwrite deliberate individual edits by default; replacement requires an explicit choice and working undo.

## Reliability, accounts and sync

- Preserve stable calendar event identities, idempotent repeated sync, updates and deletions without duplicates or orphaned events. Verify overnight/DST times, dates, titles, colours where supported, permissions and private notes. Notes are included only when explicitly enabled and allowed; keep Include notes easy to find. Subscription refresh timing belongs to the calendar provider and must be described accurately.
- Keep authenticated profiles accessible, show available Google pictures consistently, handle image failures gracefully and avoid repeated prominent names.
- Opening, navigation, editing and sheets should feel immediate. Use safe optimistic UI and subtle progress; avoid full-screen loading for small actions. Do not turn a temporary account/server failure into a separate guest calendar.
- Preserve recently loaded calendars during weak connections. Distinguish saved on device, waiting to sync, saved to cloud, expired authentication and genuine failure. Never silently discard unsynced edits or drafts; protect them across reloads, updates, account and calendar transitions.
- Audit service worker registration, fresh HTML/version checks, cache invalidation, waiting/activation/claiming, update prompts and reopening. Check for updates must always report progress and a result. Activate new versions only when edits and forms are safe; do not require repeated reinstalls.
- Make first login, empty roster/month/pattern, loading, offline, server failure, permission denied, image failure, expired auth, sync failure and update states intentional, with a useful next action and plain wording.

## Required QA loop

After each meaningful UI change: run it, open the phone layout, inspect screenshots, interact with the feature, check safe areas and neighbouring screens, fix problems and repeat. Build success alone is insufficient. Use fictional in-memory data or disposable local fixtures, never production roster mutations.

Test realistic Day/Night/Rest/Off duties, consecutive nights, overtime, leave, notes, manual overrides, linked rotations, multiple entries, long names, empty and read-only calendars. Exercise login/logout/profile, loading, shift/event CRUD, patterns and overrides, calendar navigation, Month/Week, update detection, Apple Calendar repeated sync/deletion, refresh/reopen and offline recovery. Preserve security and privacy tests.

Run AGENTS.md checks, inspect Chromium/WebKit portrait/landscape screenshots and keep deterministic regressions in CI. Run relevant integration checks for changes to sync, auth or persistence. Physical-device claims require actual device evidence. Maintain docs/PRODUCT_AUDIT.md with what was inspected, fixed, tested and still needs verification; do not mark an entire system verified from a sample UI check.

## Delivery and maintenance

GitHub Wiggli/Shiftly is the source of truth; GitHub Pages plus Supabase remain the architecture, with no Sites. Keep clean understandable commits, preserve a working deployment, merge authorised improvements and verify the published commit and live assets. Diagnose deterministic failures before retrying; bound transient retries and never bypass safety or phone-layout gates. Do not commit secrets, environment values, dependencies or generated builds. Keep useful code reusable, remove demonstrated dead code and duplication, and avoid unrelated rewrites.

This mandate authorises systematic work during development sessions, not an hourly monitoring task or a claim that the app will never have bugs. Andre has disabled recurring monitoring; leave it disabled unless he requests it again.
