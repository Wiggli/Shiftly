# Shiftly project preferences

## Standing product mandate

Read [PRODUCT_STANDARD.md](docs/PRODUCT_STANDARD.md) before changing Shiftly and maintain [PRODUCT_AUDIT.md](docs/PRODUCT_AUDIT.md) as work progresses. These are Andre's standing instructions for current and future development, not a one-off redesign brief. Own the complete product: inspect adjacent screens and states, fix routine defects autonomously, preserve working features and data, and continue systematically beyond the first reported bug. Do not replace the app or its architecture for cosmetic reasons.

Prioritise data integrity and broken functionality, calendar reliability, iPhone safe areas, entry speed, calendar readability, Week, patterns, overtime and leave, Apple Calendar, accounts, PWA updates, performance, accessibility, visual polish, then cleanup. Prefer obvious interactions and fewer steps. Never equate passing CSS/build checks with visual verification or a GitHub push with a verified release.

Keep checks on every release; do not create recurring monitoring unless Andre explicitly requests it again.

- Andre's primary UI test device is iPhone 18 Pro Max. Always use its preset first for mobile UI work and leave the review window on that preset.
- Check both portrait (440 × 956 CSS layout pixels) and landscape (956 × 440) in the standalone GitHub Pages app. Other sizes are supplementary checks, not a replacement for this device.
- This browser preview checks layout only. Do not claim it exactly reproduces iOS, Safari, device pixel density, display zoom, status bars, safe areas, or keyboard behavior; actual iPhone checks are still needed for those.
- Keep the entire month visible without page scrolling while retaining familiar app tabs, visible calendar views, readable duties, profile access, and the selected-date notes strip.
- Preserve planned duties when adding leave, overtime, or notes. Do not change real roster data while visually testing controls.
- Use the existing mutation, offline, sync, authorization and audit paths. Build the offline bundle and service worker before publishing UI changes.

- GitHub Pages and Supabase are the only active platform. Do not modify or decommission the previous deployment.
- Run `pnpm build`, `pnpm typecheck`, and relevant tests before publishing. Keep credentials and generated output out of git.

- Review both Installed and Browser layouts using the shipped ui-review.html. Installed insets are illustrative, not measured device specifications. Check Today and Patterns as well as the calendar, including long roster names and timed entries. Compare the preview build identifier with More → App details on the device before attributing a mismatch to rendering.

- Run `pnpm test:mobile` after building UI changes and fix failures before publishing. The suite exercises Chromium and WebKit in both iPhone orientations, records sample screenshots, and tests detection of a deliberately introduced 62px bottom gap. WebKit automation is still not a physical iPhone check.
- Use the live iPhone review window throughout UI work and inspect the saved screenshots. Do not wait for Andre to point out visible errors. Never use a real account or real roster for automated mutations.

- A push is not a completed release: inspect Publish Shiftly through its terminal result, then verify the live version and assets. The deploy job runs scripts/verify-live.mjs against GITHUB_SHA and must pass before claiming success. Investigate failed checks rather than bypassing them. The deliberate-gap mobile test must verify its injected fault takes effect, including overriding minimum-height safeguards.

- Include tests/mobile/surfaces.spec.ts in phone UI validation. Review its saved screenshots for forms, settings, search, patterns, account/help, comparison, and empty, long-text and read-only samples. These sample fixtures must stay in memory and must never make real account or roster mutations.
