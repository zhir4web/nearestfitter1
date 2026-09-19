import { z } from 'zod';
import { createCommunityReply, listCommunityPosts } from '@/lib/community';
import { failure, HttpError, jsonBody, privateJson, rate, sameOrigin } from '@/lib/security';
// Dashboard codes are opaque secrets and may be imported from an existing
// installation. Authorization still happens through the stored hash; limiting
// the value to hexadecimal here incorrectly rejected otherwise valid portals.
const schema = z.object({ fitter_code: z.string().trim().min(1).max(128), body: z.string().trim().min(10).max(1200) });
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const post = (await listCommunityPosts()).find((item) => item.id === id); if (!post) throw new HttpError(404, 'Post not found'); return Response.json({ replies: post.replies }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); await rate(request, 'community-reply', 15);
    const parsed = schema.safeParse(await jsonBody(request)); if (!parsed.success) throw new HttpError(400, 'Please write a useful reply.');
    const { id } = await params; const post = (await listCommunityPosts()).find((item) => item.id === id); if (!post) throw new HttpError(404, 'Post not found');
    if (!await createCommunityReply(id, parsed.data.fitter_code, parsed.data.body)) throw new HttpError(403, 'Private fitter access is required');
    return privateJson({ ok: true }, 201);
  } catch (error) { return failure(error); }
}
