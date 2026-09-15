import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, closeSync, openSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
if (process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw Error('Both Supabase server environment variables are required.');
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { error } = await client.rpc('import_legacy_account_charges');
  if (error)
    throw Error(
      'Run supabase/schema.sql then supabase/accounts.sql in your Supabase SQL editor before upgrading.',
    );
  console.log('Supabase accounting schema verified. Existing data preserved.');
} else {
  if (!process.env.DATABASE_URL?.startsWith('file:'))
    throw Error('Set DATABASE_URL in .env to your existing SQLite database.');
  const file = path.resolve('prisma', process.env.DATABASE_URL.slice(5));
  mkdirSync(path.dirname(file), { recursive: true });
  if (!existsSync(file)) closeSync(openSync(file, 'a'));
  const result = spawnSync(
    process.execPath,
    [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate'],
    { stdio: 'inherit', env: process.env },
  );
  if (result.status !== 0) process.exit(result.status || 1);
  const db = new PrismaClient();
  try {
    await db.$executeRaw`INSERT OR IGNORE INTO account_charges (id,dispatch_id,fitter_id,amount_iqd,created_at)
      SELECT id,id,fitter_id,commission_iqd,accepted_at FROM dispatch_requests
      WHERE accepted_at IS NOT NULL AND commission_iqd IS NOT NULL AND commission_status = 'due'`;
    await db.platformSetting.updateMany({ data: { commission_percent: 0 } });
    console.log(
      'Admin accounting upgraded. Existing jobs and fitters preserved. No seed data added.',
    );
  } finally {
    await db.$disconnect();
  }
}
