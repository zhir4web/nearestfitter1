import {
  getFitterByDashboardCode,
  updateFitterOnlineStatus,
  updateDispatchFitterLocation,
  getPendingDispatchForFitter,
} from '@/lib/repository';
import { jsonBody, sameOrigin, failure, rate } from '@/lib/security';


export const dynamic = 'force-dynamic';

/**
 * POST /api/fitter/location
 * Body: { fitter_code: string, lat: number, lng: number, is_online: boolean }
 * Called every ~10s from the fitter dashboard to broadcast their position.
 */
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    // 120 calls/min — generous for 10s polling interval
    await rate(req, 'fitter-location', 120, 60000);
    const body = await jsonBody(req);
    const { fitter_code, lat, lng, is_online } = body as {
      fitter_code: unknown;
      lat: unknown;
      lng: unknown;
      is_online: unknown;
    };

    if (
      typeof fitter_code !== 'string' ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !isFinite(lat) ||
      !isFinite(lng)
    ) {
      return Response.json({ error: 'Invalid data' }, { status: 400 });
    }

    const online = is_online !== false;

    // Validate fitter code
    const fitter = await getFitterByDashboardCode(fitter_code);
    if (!fitter) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update dashboard online/location status
    await updateFitterOnlineStatus(fitter.fitter_id, online, lat, lng);

    // If there's an active (accepted) dispatch, update fitter's location in it
    const pending = await getPendingDispatchForFitter(fitter.fitter_id);
    if (pending && (pending.status === 'accepted' || pending.status === 'pending')) {
      await updateDispatchFitterLocation(pending.fitter_token, lat, lng);
    }

    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

/**
 * DELETE /api/fitter/location
 * Body: { fitter_code: string }
 * Called when fitter goes offline/closes dashboard.
 */
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'fitter-location', 120, 60000);
    const body = await jsonBody(req);
    const { fitter_code } = body as { fitter_code: unknown };

    if (typeof fitter_code !== 'string') {
      return Response.json({ error: 'Invalid data' }, { status: 400 });
    }

    const fitter = await getFitterByDashboardCode(fitter_code);
    if (!fitter) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await updateFitterOnlineStatus(fitter.fitter_id, false, undefined, undefined);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
