import { getFitterByDashboardCode, getPendingDispatchForFitter } from '@/lib/repository';
import { failure, rate } from '@/lib/security';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fitterCode: string }> },
) {
  try {
    const { fitterCode } = await params;
    await rate(req, 'fitter-dashboard', 120, 60000);
    
    // Check if code is valid
    const fitter = await getFitterByDashboardCode(fitterCode);
    if (!fitter) {
      return Response.json({ error: 'Unauthorized or inactive' }, { status: 403 });
    }

    // Check for pending requests
    const pending = await getPendingDispatchForFitter(fitter.fitter_id);
    
    return Response.json({
      fitter,
      request: pending ? {
        id: pending.id,
        user_lat: pending.user_lat,
        user_lng: pending.user_lng,
        user_note: pending.user_note,
        fitter_token: pending.fitter_token,
        expires_at: pending.expires_at,
        created_at: pending.created_at,
      } : null
    });
  } catch (e) {
    return failure(e);
  }
}
