import { rows, dispatchHistory, platformSettings } from '@/lib/repository';
import { requireAdmin, failure, privateJson } from '@/lib/security';
export async function GET() {
  try {
    await requireAdmin();
    const [fitters, reviews, contacts, dispatches, settings] = await Promise.all([
      rows('fitters'), rows('reviews'), rows('contacts'), dispatchHistory(), platformSettings(),
    ]);
    return privateJson({ fitters, reviews, contacts, dispatches, settings });
  } catch (e) { return failure(e); }
}
