import { randomBytes } from 'node:crypto';
import { rate, jsonBody, sameOrigin, failure, HttpError, privateJson } from '@/lib/security';
import { getDispatchByUserToken, getDispatchById, dispatchCandidates, transitionDispatch, isReservationConflict } from '@/lib/repository';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'dispatch-reassign', 20, 3600000);
    const body = await jsonBody(req);
    if (typeof body.user_token !== 'string' || !/^[a-f0-9]{48}$/.test(body.user_token)) throw new HttpError(400, 'Invalid token');
    const status = await getDispatchByUserToken(body.user_token);
    const old = status ? await getDispatchById(status.id) : null;
    if (!old) throw new HttpError(404, 'Request not found');
    if (!['declined', 'expired'].includes(old.status)) throw new HttpError(409, 'Only expired or declined requests can be reassigned');
    if (old.reassign_count >= 10) throw new HttpError(409, 'Please create a new request');
    const tried = JSON.parse(old.tried_fitters) as string[];
    const candidates = await dispatchCandidates(old.user_lat, old.user_lng, { tried });
    for (const fitter of candidates) {
      try {
        const changed = await transitionDispatch(body.user_token, 'user', ['declined', 'expired'], 'pending', {
          fitter_id: fitter.id, fitter_token: randomBytes(24).toString('hex'),
          tried_fitters: JSON.stringify([...tried, fitter.id]), reassign_count: old.reassign_count + 1,
          expires_at: new Date(Date.now() + 120000).toISOString(),
        });
        if (!changed) throw new HttpError(409, 'This request has already changed');
        return privateJson({ user_token: body.user_token, fitter_name: fitter.name });
      } catch (e) { if (!isReservationConflict(e)) throw e; }
    }
    throw new HttpError(404, 'No other fitters are available nearby right now.');
  } catch (e) { return failure(e); }
}
