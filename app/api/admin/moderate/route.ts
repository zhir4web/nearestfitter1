import {
  sameOrigin,
  requireAdmin,
  failure,
  HttpError,
  jsonBody,
} from '@/lib/security';
import { update, remove } from '@/lib/repository';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const { table, id, action } = await jsonBody(req);
    if (
      (table !== 'reviews' && table !== 'contacts') ||
      typeof id !== 'string' ||
      (action !== 'approve' && action !== 'delete')
    )
      throw new HttpError(400, 'Invalid request');
    if (action === 'approve') {
      if (table !== 'reviews') throw new HttpError(400, 'Invalid action');
      await update('reviews', id, { status: 'approved' });
    } else await remove(table, id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
