import { failure } from '@/lib/security';
import { remote } from '@/lib/repository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/cleanup
 * Vercel Cron: runs every hour (see vercel.json).
 * Deletes expired rate_limit rows to prevent unbounded table growth.
 * Also expires stale pending dispatch_requests via Supabase or skip on local.
 */
export async function GET(req: Request) {
  // Verify this is called by Vercel Cron (or locally)
  const auth = req.headers.get('authorization');
  if (process.env.VERCEL && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const s = remote();
    const now = Date.now();
    const nowIso = new Date().toISOString();
    if (s) {
      // Clean expired rate limit rows
      await s.from('rate_limits').delete().lt('expires', now);
      // Expire stale pending dispatches
      await s
        .from('dispatch_requests')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', nowIso);
    }
    // On local (SQLite) the Prisma cleanup is handled inline in expireOldDispatches()
    return Response.json({ ok: true, cleaned_at: nowIso });
  } catch (e) {
    return failure(e);
  }
}
