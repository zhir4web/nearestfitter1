import { getFitterByDashboardCode, updateFitterOnlineStatus, updateDispatchFitterLocation, getPendingDispatchForFitter } from '@/lib/repository';
import { jsonBody, sameOrigin, failure, rate, HttpError, privateJson } from '@/lib/security';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'fitter-location', 120, 60000);
    const { fitter_code, lat, lng, is_online } = await jsonBody(req);
    if (typeof fitter_code !== 'string' || typeof is_online !== 'boolean') throw new HttpError(400, 'Invalid data');
    const fitter = await getFitterByDashboardCode(fitter_code);
    if (!fitter) throw new HttpError(403, 'Unauthorized');
    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    if (((lat != null || lng != null) && !hasCoordinates) || (is_online && fitter.fitter_type === 'mobile' && !hasCoordinates))
      throw new HttpError(400, 'A valid GPS location is required');
    await updateFitterOnlineStatus(fitter.fitter_id, is_online, hasCoordinates ? lat as number : undefined, hasCoordinates ? lng as number : undefined);
    if (is_online && hasCoordinates) {
      const request = await getPendingDispatchForFitter(fitter.fitter_id);
      if (request && ['accepted', 'en_route'].includes(request.status)) await updateDispatchFitterLocation(request.fitter_token, lat as number, lng as number);
    }
    return privateJson({ ok: true });
  } catch (e) { return failure(e); }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'fitter-location', 120, 60000);
    const { fitter_code } = await jsonBody(req);
    const fitter = typeof fitter_code === 'string' ? await getFitterByDashboardCode(fitter_code) : null;
    if (!fitter) throw new HttpError(403, 'Unauthorized');
    await updateFitterOnlineStatus(fitter.fitter_id, false);
    return privateJson({ ok: true });
  } catch (e) { return failure(e); }
}
