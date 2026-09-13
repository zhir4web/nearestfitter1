import { getDispatchFitterLocation } from '@/lib/repository';
import { failure } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dispatch/[userToken]/fitter-location
 * Returns the fitter's live GPS position for an accepted dispatch.
 * Only returns location, never exposes phone numbers or personal info.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userToken: string }> },
) {
  try {
    const { userToken } = await params;
    const data = await getDispatchFitterLocation(userToken);

    if (!data) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Only expose location for accepted/en_route dispatches
    if (data.status !== 'accepted' && data.status !== 'en_route') {
      return Response.json({
        status: data.status,
        fitter_name: data.fitter_name,
        fitter_lat: null,
        fitter_lng: null,
      });
    }

    return Response.json({
      status: data.status,
      fitter_name: data.fitter_name,
      fitter_lat: data.fitter_lat,
      fitter_lng: data.fitter_lng,
    });
  } catch (e) {
    return failure(e);
  }
}
