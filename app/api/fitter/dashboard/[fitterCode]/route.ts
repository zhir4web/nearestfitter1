import { getFitterByDashboardCode, getPendingDispatchForFitter, dispatchHistory, platformSettings } from '@/lib/repository';
import { failure, rate, HttpError, privateJson } from '@/lib/security';
export async function GET(req: Request, { params }: { params: Promise<{ fitterCode: string }> }) {
  try {
    const { fitterCode } = await params;
    await rate(req, 'fitter-dashboard', 120, 60000);
    const fitter = await getFitterByDashboardCode(fitterCode);
    if (!fitter) throw new HttpError(403, 'Unauthorized or inactive');
    const [request, jobs, settings] = await Promise.all([getPendingDispatchForFitter(fitter.fitter_id), dispatchHistory(fitter.fitter_id), platformSettings()]);
    return privateJson({ fitter, request, jobs, settings });
  } catch (e) { return failure(e); }
}
