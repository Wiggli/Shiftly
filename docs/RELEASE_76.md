# Shiftly reliability and iPhone release

Prepared on 18 October 2026 for the previous deployment. No database reset, identity replacement or audience change is part of this release.

## Fixed behavior

- iPhone editing sheets follow the visible viewport offset when the keyboard pans the page. The month heading stays within its available width, account access remains visible, and month arrows and editing buttons have larger touch targets.
- CalDAV multiget returns an explicit 404 for requested resources that have disappeared, and does not resolve another account or collection's resource path.
- Calendar dates and clock times are checked before timezone conversion, preventing impossible dates from rolling into another day.
- ICS imports retain end times, including overnight overtime and Malta clock changes. Unsupported multi-day spans, recurrence exceptions and duration-only entries are rejected before any writes.
- New imports track their source UID so repeat imports update the same entry after a date/time change. Duplicate UIDs in one file produce one entry. Existing legacy import IDs are retained when the original source date/time can be matched, then receive UID metadata. Previously moved legacy imports with no UID metadata cannot be matched retrospectively with certainty.
- Existing entry privacy is retained during reimport, and new imports default to private entries and private notes. Escaped text and quoted timezone identifiers are parsed correctly.
- Creating an Apple Calendar connection again keeps the existing username and password valid. Simultaneous creation requests insert only one login, and only its winning response reveals the new password. Password changes remain an explicit Replace password action.
- Repeated shift-editor section headings are removed.

## Preserved behavior

Planned duties remain separate from leave, overtime and notes. Copy/paste and patterns retain their existing mutation, permission, audit, offline queue and conflict handling. Stable CalDAV identifiers, deletion tombstones, private-note filtering, reconnect behavior and overnight/DST rules remain in place.

## Acceptance

The release runs TypeScript checking, the production/offline build, engine/UI/access/PWA unit checks, temporary-database API tests, CalDAV protocol tests and edit-to-sync integration tests. No real roster records are used for automated checks.

Browser layout and physical iPhone testing remain unavailable in this managed environment because the required control-browser skill is not installed. Source-based responsive checks do not verify Safari keyboard behavior, safe areas or touch usability on the actual device.

Closed-app push delivery still requires notification infrastructure. Native iOS widgets remain outside the agreed PWA scope. This release does not claim those capabilities or universal freedom from bugs.
