import { platformSettings, savePlatformSettings } from '@/lib/repository';
import { requireAdmin, sameOrigin, jsonBody, failure, HttpError, privateJson } from '@/lib/security';
export async function GET() {
  try { await requireAdmin(); return privateJson(await platformSettings()); }
  catch (e) { return failure(e); }
}
export async function PATCH(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const { commission_percent, commission_fixed_iqd } = await jsonBody(req);
    if (typeof commission_percent !== 'number' || !Number.isFinite(commission_percent) || commission_percent < 0 || commission_percent > 100 ||
        typeof commission_fixed_iqd !== 'number' || !Number.isSafeInteger(commission_fixed_iqd) || commission_fixed_iqd < 0 || commission_fixed_iqd > 1_000_000)
      throw new HttpError(400, 'Invalid commission settings');
    await savePlatformSettings({ commission_percent, commission_fixed_iqd });
    return privateJson(await platformSettings());
  } catch (e) { return failure(e); }
}
