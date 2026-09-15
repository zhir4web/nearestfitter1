import { changeCommunityPost, deleteCommunityPost, listCommunityPosts } from '@/lib/community';
import { failure, HttpError, jsonBody, privateJson, rate, sameOrigin } from '@/lib/security';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const post = (await listCommunityPosts()).find((item) => item.id === id);
    if (!post) throw new HttpError(404, 'Post not found');
    return Response.json(post);
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); await rate(request, 'community-owner', 20);
    const { owner_token, status } = await jsonBody(request); const { id } = await params;
    if (typeof owner_token !== 'string' || !/^[a-f0-9]{48}$/.test(owner_token) || !['open', 'resolved'].includes(String(status))) throw new HttpError(400, 'Invalid request');
    if (!await changeCommunityPost(id, owner_token, status as 'open' | 'resolved')) throw new HttpError(404, 'Post not found');
    return privateJson({ ok: true });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); await rate(request, 'community-owner', 20);
    const { owner_token } = await jsonBody(request); const { id } = await params;
    if (typeof owner_token !== 'string' || !/^[a-f0-9]{48}$/.test(owner_token)) throw new HttpError(400, 'Invalid request');
    if (!await deleteCommunityPost(id, owner_token)) throw new HttpError(404, 'Post not found');
    return privateJson({ ok: true });
  } catch (error) { return failure(error); }
}
