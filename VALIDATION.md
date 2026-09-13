# Validation — 6 September 2026

## Passed

- Next.js production build and TypeScript checks, without build warnings.
- Dependency audit: zero reported vulnerabilities.
- 25 integration checks against both the development server and the production server: distance calculations, overnight and closed schedules, approved listing visibility, access control, cross-origin protection, honeypot rejection, admin login, public submissions, private pending photos, approval, photo decoding and replacement, listing edits, rating validation, review moderation and averages, saved contact messages, deletion and logout.
- Browser: OpenStreetMap tiles and red/green pins render; mobile filter updates both list and map; profile sheet opens and closes; a review submission shows its success state; a public shop submission shows its pending confirmation; admin login and approval succeed.
- Browser layout checks at 360×800 and 768×1024, plus the desktop preview. Corrected the initial mobile map-control overlap and checked the expanding bottom sheet.
- English changes the layout to LTR; Sorani uses RTL. All three dictionaries contain the same interface keys.
- Temporary automated and browser test records removed; the original nine demo listings remain.

## Dispatch System — 14 September 2026

Additional integration tests covering the dispatch and fitter dashboard subsystem:

- **Out-of-area validation**: `POST /api/dispatch` returns 422 for coordinates outside 35.2–35.9 N / 45.0–45.9 E (Sulaymaniyah bounding box).
- **Dispatch creation**: nearest open non-demo fitter is selected; `user_token` and `fitter_name` returned.
- **Privacy**: `user_phone` is never present in `/api/dispatch/[userToken]` (user status) or `/api/dispatch/[userToken]/fitter-location` (location polling) responses.
- **Dashboard auth**: invalid dashboard code returns 403; valid code returns correct fitter info.
- **Dashboard code strength**: admin `PATCH` (approve) returns a 32-character hex code generated from `randomBytes(16)`.
- **Accept / complete flow**: dispatch transitions `pending → accepted → completed` via fitter token endpoints.
- **Decline flow**: dispatch transitions to `declined` on fitter `POST /api/dispatch/decline/[fitterToken]`.
- **Rate limiting**: `POST /api/fitter/location` enforces 120 req/min; endpoint correctly returns 200 for valid burst.
- **Auto-dashboard**: approving or creating a fitter via admin automatically calls `createFitterDashboard`, so fitters no longer require a manual one-off script.

## Supabase production path

All 13 dispatch/dashboard repository functions now check `remote()` (Supabase) first and fall back to `local()` (SQLite). When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the entire dispatch flow operates via Supabase and is compatible with serverless Vercel deployments. The `supabase/schema.sql` file now includes `dispatch_requests` and `fitter_dashboards` tables with RLS enabled and matching indexes.

## Security changes

- `vercel.json` no longer contains any secrets; `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` must be set only in Vercel → Settings → Environment Variables.
- `/scratch/` is added to `.gitignore`; test-login files with hardcoded credentials are no longer tracked.
- `POST` and `DELETE /api/fitter/location` are now rate-limited (120/min).
- `GET /api/fitter/dashboard/[fitterCode]` is now rate-limited (120/min).

## Validation limits

- No Supabase credentials or hosting account deployment were provided. The Supabase adapter and provisioning SQL are included but not tested against a live project. The delivered running instance uses local SQLite and local photo storage.
- Real operator contact phone/email are not available; their display is configurable and remains hidden. Contact form submissions are saved.
- Browser location-denied fallback was observed, and distance/time logic was tested. Successful physical-device GPS acquisition depends on the device/browser provider and was not claimed as tested.
- Call, WhatsApp and directions URL construction is implemented. No actual phone call, WhatsApp message or trip was initiated. Demo contact actions are intentionally disabled.
- Sorani copy is hand-authored; it has not received an independent native-speaker editorial review. Accessibility checks are practical layout/interaction checks, not a formal WCAG certification.

Run instructions, environment variables, deployment steps and operational assumptions are in README.md.
