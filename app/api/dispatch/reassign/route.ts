import { randomBytes } from 'node:crypto';
import { rate, jsonBody, sameOrigin, failure } from '@/lib/security';
import {
  createDispatch,
  expireOldDispatches,
  getDispatchById,
  publicFitters,
  updateDispatchStatus,
} from '@/lib/repository';
import { opening } from '@/lib/geo';
import { getDispatchByUserToken } from '@/lib/repository';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'dispatch', 5, 3600000);

    const body = await jsonBody(req);
    const { user_token } = body as { user_token: string };

    if (!user_token) {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    const oldReq = await getDispatchByUserToken(user_token);
    if (!oldReq) return Response.json({ error: 'Not found' }, { status: 404 });
    
    // We need the full dispatch to get user_phone, user_note, etc.
    const fullOldReq = await getDispatchById(oldReq.id);
    if (!fullOldReq) return Response.json({ error: 'Not found' }, { status: 404 });

    // Mark old as reassigning
    await updateDispatchStatus(fullOldReq.id, 'reassigning');

    const tried = JSON.parse(fullOldReq.tried_fitters) as string[];

    // Find nearest open non-demo fitter not in tried list
    const fitters = await publicFitters();
    const now = new Date();
    const open = fitters.filter(
      (f) => !f.demo && opening(f.working_hours, now).open && !tried.includes(f.id),
    );

    if (!open.length) {
      return Response.json(
        { error: 'No fitters available right now.' },
        { status: 404 },
      );
    }

    // Sort by Haversine distance
    function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
      const r = Math.PI / 180;
      const d =
        Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
        Math.cos(lat1 * r) *
          Math.cos(lat2 * r) *
          Math.sin(((lng2 - lng1) * r) / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(1 - d));
    }

    const nearest = open.sort(
      (a, b) =>
        dist(fullOldReq.user_lat, fullOldReq.user_lng, a.latitude, a.longitude) -
        dist(fullOldReq.user_lat, fullOldReq.user_lng, b.latitude, b.longitude),
    )[0];

    const id = randomBytes(12).toString('hex');
    const fitter_token = randomBytes(24).toString('hex');
    const new_user_token = randomBytes(24).toString('hex');
    const nowObj = new Date();

    const dispatch = {
      id,
      fitter_id: nearest.id,
      user_lat: fullOldReq.user_lat,
      user_lng: fullOldReq.user_lng,
      user_phone: fullOldReq.user_phone,
      user_note: fullOldReq.user_note,
      status: 'pending' as const,
      fitter_token,
      user_token: new_user_token,
      tried_fitters: JSON.stringify([...tried, nearest.id]),
      reassign_count: fullOldReq.reassign_count + 1,
      expires_at: new Date(nowObj.getTime() + 2 * 60 * 1000).toISOString(),
      created_at: nowObj.toISOString(),
    };

    await createDispatch(dispatch);

    return Response.json({
      user_token: new_user_token,
      fitter_name: nearest.name,
    });
  } catch (e) {
    return failure(e);
  }
}
