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
    const { commission_fixed_iqd } = await jsonBody(req);
    if (typeof commission_fixed_iqd !== 'number' || !Number.isSafeInteger(commission_fixed_iqd) || commission_fixed_iqd < 0 || commission_fixed_iqd > 1_000_000)
      throw new HttpError(400, 'بڕی پارە دەبێت ژمارەیەکی تەواو بێت لە نێوان ٠ و ١,٠٠٠,٠٠٠ دینار.');
    await savePlatformSettings({ commission_percent: 0, commission_fixed_iqd });
    return privateJson(await platformSettings());
  } catch (e) { return failure(e); }
}
