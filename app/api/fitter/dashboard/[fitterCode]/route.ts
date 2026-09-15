import { getFitterByDashboardCode, getPendingDispatchForFitter, dispatchHistory, platformSettings } from '@/lib/repository';
import { failure, rate, HttpError, privateJson } from '@/lib/security';
import { accountSummaries } from '@/lib/accounts';
export async function GET(req: Request, { params }: { params: Promise<{ fitterCode: string }> }) {
  try {
    const { fitterCode } = await params;
    await rate(req, 'fitter-dashboard', 120, 60000);
    const fitter = await getFitterByDashboardCode(fitterCode);
    if (!fitter) throw new HttpError(403, 'Unauthorized or inactive');
    const [request, jobs, settings, accounts] = await Promise.all([getPendingDispatchForFitter(fitter.fitter_id), dispatchHistory(fitter.fitter_id), platformSettings(), accountSummaries(fitter.fitter_id)]);
    return privateJson({ fitter, request, jobs, settings, account: accounts[0] ?? null });
  } catch (e) { return failure(e); }
}
