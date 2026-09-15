import { failure, sameOrigin, jsonBody, rate, HttpError, privateJson } from '@/lib/security';
import { getDispatchByFitterToken, getFitterByDashboardCode, transitionDispatch } from '@/lib/repository';
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
    if (!await transitionDispatch(fitterToken, 'fitter', ['pending'], 'declined'))
      throw new HttpError(409, 'This request has already changed');
    return privateJson({ ok: true });
  } catch (e) { return failure(e); }
}
