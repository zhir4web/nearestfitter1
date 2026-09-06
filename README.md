# نزیکترین فیتەر / NearestFitter

A Sorani-first, RTL directory for tire repair shops and mobile fitters in Sulaymaniyah. Built with Next.js App Router, React, TypeScript, Tailwind, Leaflet/react-leaflet, OpenStreetMap, Prisma/SQLite and an interchangeable Supabase repository.

## Run locally

Use Node.js **22.18 or newer** (Node 24 recommended) and npm.

```sh
npm ci
npm run setup
npm run db:setup
npm run dev
```

Open http://127.0.0.1:3000. The prepared workspace already has a local database and `.env`; `setup` preserves existing configuration. The initial workspace password is in the separate private `ADMIN-ACCESS.txt` deliverable, never in source. Fresh installations choose their own password with `npm run setup`.

`setup` asks for a password of at least 12 characters, stores only a salted scrypt hash, and generates a random session secret. The terminal prompt is visible; run it in a private terminal. `npm run password` prints a new hash to put in `ADMIN_PASSWORD_HASH`. Rotate `SESSION_SECRET` at the same time to invalidate existing sessions. Restart after changing server environment variables.

```sh
npm run build
npm start
```

The development and production commands bind to loopback for local use. For a persistent self-hosted Node server, change the hostname as appropriate, use HTTPS, a reverse proxy, and durable disk. Back up `prisma/dev.db` and `data/uploads` together.

## Environment variables

| Variable                    | Purpose                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | SQLite URL, defaults in the example to `file:./dev.db`, resolved relative to `prisma/`. Set this value even for a Supabase build so Prisma generation has its schema configuration. |
| `ADMIN_PASSWORD_HASH`       | Required for admin login. `salt:hex` from the supplied scrypt password script. Never a plaintext password.                                                                          |
| `SESSION_SECRET`            | Required for admin login. At least 32 characters of cryptographically random data. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.        |
| `SUPABASE_URL`              | Optional locally; required on Vercel. The Supabase project URL.                                                                                                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key. Never prefix with `NEXT_PUBLIC_`. Both Supabase variables select the remote repository.                                                               |
| `UPLOAD_DIR`                | Local photo storage; defaults to `data/uploads`. Ignored with Supabase.                                                                                                             |
| `NEXT_PUBLIC_CONTACT_PHONE` | Real operator contact number, in international format. Hidden when unset. Requires rebuilding.                                                                                      |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Real operator email address. Hidden when unset. Requires rebuilding.                                                                                                                |

No operator phone or email was supplied, so the working contact form is the available contact channel until these two values are provided. Messages are saved in the admin inbox; the app does not send email.

## Deploy on Vercel with Supabase

SQLite files cannot provide durable storage on Vercel. The server refuses to silently use SQLite when `VERCEL` is set. A real Supabase project is required for hosted operation.

1. Create a Supabase project and run `supabase/schema.sql` once in its SQL editor. This creates the tables, indexes, private `fitter-photos` bucket, and atomic rate-limiting function. This one-time database provisioning is required in addition to environment variables.
2. Set the two Supabase variables and the admin variables in `.env`. Run `npm run seed` if you want the nine demo listings in Supabase. Seeding is explicit, idempotent, and never happens automatically on a request or build.
3. Import this directory as a Next.js project in Vercel. Use the default install command, `npm run build`, and the default Next.js output. Add the variables listed above in Vercel, including `DATABASE_URL=file:./dev.db` for build tooling. No custom Vercel configuration file is needed.
4. Deploy, open `/admin`, and replace or remove demo entries. Add real contact information before sharing the site with drivers.

The Supabase adapter and SQL are implemented, but live Supabase/Vercel validation requires your project credentials. This workspace was validated with SQLite. No hosted deployment has been made. The Sites scaffold was adapted to the explicitly requested Next.js/Vercel architecture; its Cloudflare Worker hosting is not used for this Node/Prisma build.

## Features and decisions

- `/`: Map, fixed/mobile markers, geolocation, Haversine sorting, nearest-five highlighting, neighborhood/name search, type/open/service filters, responsive draggable list, detailed profile sheet.
- `/add`: Required location confirmation through map click or coordinate entry, weekly hours, services, optional photos and pending submission.
- `/admin`: Password login, add/edit/delete listings, approve pending shops, review moderation and contact inbox.
- `/about`, `/contact`: Sorani/English/Arabic content and saved contact submissions.
- Contact actions use `tel:` and WhatsApp international numbers. Directions use the Apple Maps HTTPS universal link, without a map API key; the operating system/browser determines whether it opens an installed app or the web map.
- Nine fictional, explicitly labeled examples use real neighborhood names and approximate coordinates. They are not verified businesses. Their contact and directions actions are intentionally disabled to avoid sending a driver to a fictional service. No fabricated ratings or reviews are seeded.
- Primary Sorani interface, English and Arabic toggles. Names and addresses are listing data and remain as entered. Language is the only state stored in localStorage.
- Hours follow `Asia/Baghdad`, refresh every 30 seconds, and support overnight schedules, closed days and 24-hour service. Sunday is index 0. Equal opening/closing times require explicitly selecting 24 hours.
- Coordinates are restricted to the greater Sulaymaniyah area (35.2–35.9 latitude, 45.0–45.9 longitude). Distances before geolocation are clearly labeled as distances from the city center; mobile-fitter locations represent a service base, not live vehicle tracking.
- With location permission denied, drivers can search by neighborhood. Successful location access requires HTTPS or localhost and a browser/device location provider.
- Photos are decoded, limited to 4 MB / 25 megapixels, stripped of metadata and resized to WebP. Public photos use Next Image optimization. Admin previews bypass optimization so authentication cookies reach the private photo endpoint. Uploading SVG and arbitrary files is rejected.
- Pending records and photos are hidden from anonymous access. Reviews publish only after approval. Names/comments render as text, never raw HTML.
- Scrypt password verification, HMAC-signed eight-hour HttpOnly/SameSite sessions (Secure in production), same-host Origin checks for writes, schema validation, bounded request reads, honeypots and persistent atomic rate limits. Do not allow an untrusted proxy to pass arbitrary forwarding headers; Vercel uses its platform forwarding header. Change the session secret to revoke all sessions.
- Public submissions, reviews and messages are limited to five per hour per address; login allows eight attempts per 15 minutes. Rate-limit keys are hashes, not stored IP strings. For a larger service, add scheduled cleanup of expired rate-limit rows and abuse monitoring.
- Database access is isolated in `lib/repository.ts`; upload storage is isolated in `lib/photos.ts`. Supabase RLS exposes no direct anonymous table access; only the server holds the service-role key.
- OpenStreetMap tiles require internet connectivity and are subject to the tile service's usage policy. A tile error leaves search/list functionality available.

## Verification

Run the app, then run the integration test against a disposable local development database:

```sh
# Set TEST_ADMIN_PASSWORD to the password of that test instance.
node --env-file=.env tests/integration.mjs
```

In the prepared workspace the test can read its private test credential from `work/`; this file is not distributed in the source ZIP. `TEST_BASE_URL` optionally changes the test server URL. Tests create and remove only their temporary listing, review and contact records; nine seeded demos are expected. Rate limits deliberately apply to tests too, so repeated runs within an hour can hit them.

The test covers distance calculations, overnight/closed hours, approved-only visibility, unauthorized access, cross-origin rejection, honeypot rejection, login cookies, public submission, photo privacy, approval, editing/photo replacement, invalid ratings, review approval and averages, contact persistence, deletion, and logout. See `VALIDATION.md` for the completed checks and limits.

The dependency overrides update Prisma's transitive configuration helpers to patched versions; database generation, queries and the production build are checked with these overrides.

## Project layout

`app/` routes and API handlers · `components/` interfaces · `lib/` validation, storage, security, location and translations · `types/` shared models · `prisma/` SQLite schema · `supabase/` hosted schema · `scripts/` setup and seeding · `tests/` integration checks.
