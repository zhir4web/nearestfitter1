import { deleteCommunityPost, listCommunityPosts } from '@/lib/community';
import { failure, HttpError, jsonBody, privateJson, sameOrigin } from '@/lib/security';
import { requireAdmin } from '@/lib/security';
export async function GET() { try { await requireAdmin(); return privateJson(await listCommunityPosts(true)); } catch (error) { return failure(error); } }
export async function DELETE(request: Request) {
  try { sameOrigin(request); await requireAdmin(); const { id } = await jsonBody(request); if (typeof id !== 'string') throw new HttpError(400, 'Invalid post'); if (!await deleteCommunityPost(id)) throw new HttpError(404, 'Post not found'); return privateJson({ ok: true }); }
  catch (error) { return failure(error); }
}
