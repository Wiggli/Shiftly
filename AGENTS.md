# Shiftly project preferences

- Andre's primary UI test device is iPhone 18 Pro Max. Always use its preset first for mobile UI work and leave the review window on that preset.
- Check both portrait (440 × 956 CSS layout pixels) and landscape (956 × 440) in the standalone GitHub Pages app. Other sizes are supplementary checks, not a replacement for this device.
- This browser preview checks layout only. Do not claim it exactly reproduces iOS, Safari, device pixel density, display zoom, status bars, safe areas, or keyboard behavior; actual iPhone checks are still needed for those.
- Keep the entire month visible without page scrolling while retaining familiar app tabs, visible calendar views, readable duties, profile access, and the selected-date notes strip.
- Preserve planned duties when adding leave, overtime, or notes. Do not change real roster data while visually testing controls.
- Use the existing mutation, offline, sync, authorization and audit paths. Build the offline bundle and service worker before publishing UI changes.

- GitHub Pages and Supabase are the only active platform. Do not modify or decommission the previous deployment.
- Run `pnpm build`, `pnpm typecheck`, and relevant tests before publishing. Keep credentials and generated output out of git.
