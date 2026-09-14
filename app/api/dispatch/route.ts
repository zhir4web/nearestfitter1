import { randomBytes } from 'node:crypto';
import { rate, jsonBody, sameOrigin, failure } from '@/lib/security';
import {
  createDispatch,
  expireOldDispatches,
  getActiveFitterIds,
  publicFitters,
} from '@/lib/repository';
import { opening } from '@/lib/geo';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'dispatch', 5, 3600000);

    const body = await jsonBody(req);
    const { user_lat, user_lng, user_phone, user_note, tried_fitters } = body as {
      user_lat: unknown;
      user_lng: unknown;
      user_phone: unknown;
      user_note: unknown;
      tried_fitters?: string[];
    };

    if (
      typeof user_lat !== 'number' ||
      typeof user_lng !== 'number' ||
      !isFinite(user_lat) ||
      !isFinite(user_lng) ||
      typeof user_phone !== 'string' ||
      user_phone.length < 5
    ) {
      return Response.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Validate coordinates are within Sulaymaniyah service area
    if (
      user_lat < 35.2 || user_lat > 35.9 ||
      user_lng < 45.0 || user_lng > 45.9
    ) {
      return Response.json(
        { error: 'موقعیت لە دەرەوەی خزمەتگوزاریە. تەنها سلێمانی.' },
        { status: 422 },
      );
    }

    const note = typeof user_note === 'string' ? user_note.substring(0, 500) : '';
    const tried = Array.isArray(tried_fitters) ? tried_fitters : [];

    // Expire stale requests
    await expireOldDispatches();

    // Find nearest open non-demo fitter not in tried list
    const fitters = await publicFitters();
    const now = new Date();
    const busy = await getActiveFitterIds();
    const open = fitters.filter(
      (f) =>
        f.status === 'approved' &&
        !f.demo &&
        !tried.includes(f.id) &&
        !busy.has(f.id) &&
        f.working_hours?.length > 0 &&
        opening(f.working_hours, now).open,
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
        dist(user_lat, user_lng, a.latitude, a.longitude) -
        dist(user_lat, user_lng, b.latitude, b.longitude),
    )[0];

    const id = randomBytes(12).toString('hex');
    const fitter_token = randomBytes(24).toString('hex');
    const user_token = randomBytes(24).toString('hex');
    const nowObj = new Date();

    const dispatch = {
      id,
      fitter_id: nearest.id,
      user_lat,
      user_lng,
      user_phone,
      user_note: note,
      status: 'pending' as const,
      fitter_token,
      user_token,
      tried_fitters: JSON.stringify([...tried, nearest.id]),
      reassign_count: tried.length,
      expires_at: new Date(nowObj.getTime() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
      created_at: nowObj.toISOString(),
    };

    await createDispatch(dispatch);

    return Response.json({
      user_token,
      fitter_name: nearest.name,
    });
  } catch (e) {
    return failure(e);
  }
}
