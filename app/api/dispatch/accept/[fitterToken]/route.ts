import { failure, jsonBody } from '@/lib/security';
import { getDispatchByFitterToken, updateDispatchStatus } from '@/lib/repository';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fitterToken: string }> },
) {
  try {
    const { fitterToken } = await params;
    const dispatch = await getDispatchByFitterToken(fitterToken);
    if (!dispatch) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if this is a "complete job" call from the fitter dashboard
    let body: Record<string, unknown> = {};
    try {
      body = await jsonBody(req);
    } catch {
      // No body = normal accept
    }

    if (body.complete) {
      // Mark as completed
      if (dispatch.status !== 'accepted') {
        return Response.json({ error: 'Not in accepted state' }, { status: 409 });
      }
      await updateDispatchStatus(dispatch.id, 'completed', {
        completed_at: new Date().toISOString(),
      });
      return Response.json({ ok: true });
    }

    // Normal accept
    if (dispatch.status !== 'pending') {
      return Response.json({ error: 'Already handled' }, { status: 409 });
    }
    await updateDispatchStatus(dispatch.id, 'accepted', {
      accepted_at: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
