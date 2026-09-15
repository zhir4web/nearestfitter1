import { failure, jsonBody, sameOrigin, rate, HttpError, privateJson } from '@/lib/security';
import { getDispatchByFitterToken, getFitterByDashboardCode, getDispatchById, transitionDispatch } from '@/lib/repository';
import { acceptWithCharge } from '@/lib/accounts';
export async function POST(req: Request, { params }: { params: Promise<{ fitterToken: string }> }) {
  try {
    sameOrigin(req);
    await rate(req, 'dispatch-action', 120, 60000);
    const { fitterToken } = await params;
    const body = await jsonBody(req);
    const fitter = typeof body.fitter_code === 'string' ? await getFitterByDashboardCode(body.fitter_code) : null;
    if (!fitter) throw new HttpError(403, 'Private fitter access is required');
    const dispatch = await getDispatchByFitterToken(fitterToken);
    if (!dispatch || dispatch.fitter_id !== fitter.fitter_id) throw new HttpError(404, 'Request not found');
    const action = body.complete === true ? 'complete' : body.action ?? 'accept';
    let changed = false;
    if (action === 'accept') {
      changed = await acceptWithCharge(fitterToken, fitter.fitter_id);
    } else if (action === 'en_route') {
      changed = await transitionDispatch(fitterToken, 'fitter', ['accepted'], 'en_route');
    } else if (action === 'complete') {
      const full = await getDispatchById(dispatch.id);
      if (!full) throw new HttpError(404, 'Request not found');
      // Finalizing job, commission was already recorded on accept. No price required from fitter.
      changed = await transitionDispatch(fitterToken, 'fitter', ['accepted', 'en_route'], 'completed', {
        completed_at: new Date().toISOString(),
      });
    } else throw new HttpError(400, 'Unknown action');
    if (!changed) throw new HttpError(409, 'This request changed or expired. Refresh to see its status.');
    return privateJson({ ok: true });
  } catch (e) { return failure(e); }
}
