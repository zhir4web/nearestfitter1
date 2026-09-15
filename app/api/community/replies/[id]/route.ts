import { removeCommunityReply } from '@/lib/community';
import { communityIdSchema } from '@/lib/community-validation';
import { failure, HttpError, requireAdmin, sameOrigin } from '@/lib/security';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    if (!communityIdSchema.safeParse(id).success) throw new HttpError(400, 'Invalid reply');
    await removeCommunityReply(id);
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
