# Admin update validation — 2026-09-15

Based on `nearestfitter1-main (5).zip`. Product changes focus on admin and its shared accounting endpoints. Customer and fitter interfaces retain the supplied design.

Passed:
- `tsc --noEmit` and `npm run build -- --webpack` (production build).
- `tests/admin-accounts.mjs` on an isolated SQLite `qa-admin.db`, against the production server: authenticated APIs, invalid fee validation, create/edit fitter synchronization, concurrent acceptance (one success, one conflict), unique charge, fee snapshots, completion, cancellation, settlement with expected balance/count, idempotent receipt, historical totals, legacy import, protected deletion, and transaction rollback.
- `tests/marketplace.mjs` on the same isolated database: private/public data boundaries, authorization, reservations, request lifecycle, community posts and fitter replies, ratings moderation.
- Visual inspection at the default desktop viewport and 390×844: horizontal admin navigation, full-width content, mobile account cards, empty states.
- SQLite `db:upgrade` preserves existing preview jobs and fitters and does not seed data.

The Supabase additive migration and atomic RPC implementation are included in `supabase/accounts.sql`. They have not been executed against a live Supabase database in this session. Configure server credentials and apply the migration to staging before production deployment.

The webpack option was used because the isolated review workspace shares dependencies through a junction, which Turbopack does not support across its filesystem root. The distributed ZIP has no dependency junction and retains the normal dev/build commands.

The downloadable source excludes private environment files, SQLite databases, test credentials, dependencies and generated builds. See `ADMIN-UPDATE.md` for installation and database upgrade instructions.
