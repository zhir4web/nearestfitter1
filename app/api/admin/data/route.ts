import { rows, dispatchHistory, platformSettings } from '@/lib/repository';
import { requireAdmin, failure, privateJson } from '@/lib/security';
import { accountSummaries } from '@/lib/accounts';
import { listCommunityPosts } from '@/lib/community';
export async function GET() {
  try {
    await requireAdmin();
    const [fitters, reviews, contacts, dispatches, settings, accounts, community] = await Promise.all([
      rows('fitters'), rows('reviews'), rows('contacts'), dispatchHistory(), platformSettings(), accountSummaries(), listCommunityPosts(true),
    ]);
    return privateJson({ fitters, reviews, contacts, dispatches, settings, accounts, community });
  } catch (e) { return failure(e); }
}
