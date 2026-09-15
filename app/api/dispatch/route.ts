import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { rate, jsonBody, sameOrigin, failure, HttpError, privateJson } from '@/lib/security';
import { createDispatch, dispatchCandidates, isReservationConflict } from '@/lib/repository';
const schema = z.object({
  user_lat: z.number().finite(), user_lng: z.number().finite(),
  user_phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,22}$/),
  user_note: z.string().trim().max(500).optional().default(''),
  fitter_id: z.string().max(100).optional(), service: z.string().max(60).optional(),
  type: z.enum(['fixed', 'mobile']).optional(),
});
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'dispatch', 12, 3600000);
    const parsed = schema.safeParse(await jsonBody(req));
    if (!parsed.success) throw new HttpError(400, 'Invalid request details');
    const data = parsed.data;
    if (data.user_lat < 35.2 || data.user_lat > 35.9 || data.user_lng < 45 || data.user_lng > 45.9)
      throw new HttpError(422, 'Your location is outside the Sulaymaniyah service area.');
    const candidates = await dispatchCandidates(data.user_lat, data.user_lng, data);
    for (const fitter of candidates) {
      const now = new Date();
      const user_token = randomBytes(24).toString('hex');
      try {
        await createDispatch({
          id: randomBytes(12).toString('hex'), fitter_id: fitter.id,
          user_lat: data.user_lat, user_lng: data.user_lng,
          user_phone: data.user_phone, user_note: data.user_note, status: 'pending',
          fitter_token: randomBytes(24).toString('hex'), user_token,
          tried_fitters: JSON.stringify([fitter.id]), reassign_count: 0,
          expires_at: new Date(now.getTime() + 120000).toISOString(), created_at: now.toISOString(),
        });
        return privateJson({ user_token, fitter_name: fitter.name }, 201);
      } catch (e) { if (!isReservationConflict(e)) throw e; }
    }
    throw new HttpError(404, 'No fitters are available nearby right now. Please try again later.');
  } catch (e) { return failure(e); }
}
