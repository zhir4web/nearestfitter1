# Validation — 6 September 2026

## Passed

- Next.js production build and TypeScript checks, without build warnings.
- Dependency audit: zero reported vulnerabilities.
- 25 integration checks against both the development server and the production server: distance calculations, overnight and closed schedules, approved listing visibility, access control, cross-origin protection, honeypot rejection, admin login, public submissions, private pending photos, approval, photo decoding and replacement, listing edits, rating validation, review moderation and averages, saved contact messages, deletion and logout.
- Browser: OpenStreetMap tiles and red/green pins render; mobile filter updates both list and map; profile sheet opens and closes; a review submission shows its success state; a public shop submission shows its pending confirmation; admin login and approval succeed.
- Browser layout checks at 360×800 and 768×1024, plus the desktop preview. Corrected the initial mobile map-control overlap and checked the expanding bottom sheet.
- English changes the layout to LTR; Sorani uses RTL. All three dictionaries contain the same interface keys.
- Temporary automated and browser test records removed; the original nine demo listings remain.

## Validation limits

- No Supabase credentials or hosting account deployment were provided. The Supabase adapter and provisioning SQL are included but not tested against a live project. The delivered running instance uses local SQLite and local photo storage.
- Real operator contact phone/email are not available; their display is configurable and remains hidden. Contact form submissions are saved.
- Browser location-denied fallback was observed, and distance/time logic was tested. Successful physical-device GPS acquisition depends on the device/browser provider and was not claimed as tested.
- Call, WhatsApp and directions URL construction is implemented. No actual phone call, WhatsApp message or trip was initiated. Demo contact actions are intentionally disabled.
- Sorani copy is hand-authored; it has not received an independent native-speaker editorial review. Accessibility checks are practical layout/interaction checks, not a formal WCAG certification.

Run instructions, environment variables, deployment steps and operational assumptions are in README.md.
