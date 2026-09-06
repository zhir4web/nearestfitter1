import { randomBytes } from 'node:crypto';
import { rate, jsonBody, sameOrigin, failure } from '@/lib/security';
import {
  createDispatch,
  expireOldDispatches,
  publicFitters,
} from '@/lib/repository';
import { opening } from '@/lib/geo';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'dispatch', 5, 3600000);

    const body = await jsonBody(req);
    const { user_lat, user_lng } = body as {
      user_lat: unknown;
      user_lng: unknown;
    };

    if (
      typeof user_lat !== 'number' ||
      typeof user_lng !== 'number' ||
      !isFinite(user_lat) ||
      !isFinite(user_lng)
    ) {
      return Response.json({ error: 'Invalid location' }, { status: 400 });
    }

    // Expire stale requests
    await expireOldDispatches();

    // Find nearest open non-demo fitter
    const fitters = await publicFitters();
    const now = new Date();
    const open = fitters.filter(
      (f) => !f.demo && opening(f.working_hours, now).open,
    );

    if (!open.length) {
      return Response.json(
        { error: 'No open fitters available right now.' },
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

    const dispatch = {
      id,
      fitter_id: nearest.id,
      user_lat,
      user_lng,
      status: 'pending' as const,
      fitter_token,
      user_token,
      created_at: new Date().toISOString(),
    };

    await createDispatch(dispatch);

    // Build WhatsApp link for fitter (if they have WhatsApp)
    const acceptUrl = `${req.headers.get('origin')}/request/${fitter_token}`;
    let whatsapp_url: string | null = null;
    if (nearest.whatsapp) {
      const msg = encodeURIComponent(
        `🚨 داواکاریی فیتەری نوێ!\nبەکارهێنەرێک نزیکتە و داوای یارمەتی دەکات.\n📍 شوێن: https://maps.google.com/?q=${user_lat},${user_lng}\n✅ قبووڵکردن: ${acceptUrl}`,
      );
      whatsapp_url = `https://wa.me/${nearest.whatsapp.replace(/\D/g, '')}?text=${msg}`;
    }

    return Response.json({
      user_token,
      fitter_id: nearest.id,
      fitter_name: nearest.name,
      fitter_phone: nearest.phone,
      fitter_whatsapp: nearest.whatsapp,
      whatsapp_url,
      accept_url: acceptUrl,
    });
  } catch (e) {
    return failure(e);
  }
}
