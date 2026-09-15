import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { remote } from './repository';
import { getFitterByDashboardCode } from './repository';
import type { CommunityPost, CommunityReply, CommunityStatus } from '@/types/community';

export type CommunityInput = { author_name: string; title: string; car_model: string; neighborhood: string; body: string };
const hashOwner = (token: string) => createHash('sha256').update(token).digest('hex');
const publicReply = (reply: { id: string; post_id: string; fitter_id: string; body: string; created_at: string; fitter?: { name: string; type: string } | null }): CommunityReply => ({
  id: reply.id, post_id: reply.post_id, fitter_id: reply.fitter_id, fitter_name: reply.fitter?.name || 'NearestFitter fitter', fitter_type: reply.fitter?.type || 'fixed', body: reply.body, created_at: reply.created_at,
});

function local() {
  if (process.env.VERCEL && !process.env.SUPABASE_URL) return null;
  const globalDb = globalThis as unknown as { db?: PrismaClient };
  return (globalDb.db ??= new PrismaClient());
}

export async function listCommunityPosts(includeHidden = false): Promise<CommunityPost[]> {
  const s = remote();
  if (s) {
    let query = s.from('community_posts').select('id,author_name,title,car_model,neighborhood,body,status,created_at').order('created_at', { ascending: false }).limit(100);
    if (!includeHidden) query = query.neq('status', 'hidden');
    const { data: posts, error } = await query;
    if (error) throw error;
    const ids = (posts || []).map((post) => post.id);
    const { data: replies, error: replyError } = ids.length ? await s.from('community_replies').select('id,post_id,fitter_id,body,created_at,fitters(name,type)').in('post_id', ids).order('created_at', { ascending: true }) : { data: [], error: null };
    if (replyError) throw replyError;
    return (posts || []).map((post) => ({ ...post, replies: (replies || []).filter((reply) => reply.post_id === post.id).map((reply) => publicReply({ ...reply, fitter: Array.isArray(reply.fitters) ? reply.fitters[0] : reply.fitters } as never)) })) as CommunityPost[];
  }
  const db = local();
  if (!db) return [];
  const posts = await db.communityPost.findMany({ where: includeHidden ? undefined : { status: { not: 'hidden' } }, orderBy: { created_at: 'desc' }, take: 100, include: { replies: { orderBy: { created_at: 'asc' }, include: { fitter: { select: { name: true, type: true } } } } } });
  return posts.map((post) => ({ id: post.id, author_name: post.author_name, title: post.title, car_model: post.car_model, neighborhood: post.neighborhood, body: post.body, status: post.status as CommunityStatus, created_at: post.created_at, replies: post.replies.map((reply) => publicReply(reply)) }));
}

export async function createCommunityPost(input: CommunityInput, ownerToken: string) {
  const record = { id: randomUUID(), ...input, status: 'open' as const, owner_hash: hashOwner(ownerToken), created_at: new Date().toISOString() };
  const s = remote();
  if (s) { const { error } = await s.from('community_posts').insert(record); if (error) throw error; }
  else { const db = local(); if (!db) throw new Error('Database not configured'); await db.communityPost.create({ data: record }); }
  return record.id;
}

export async function removeCommunityReply(id: string) {
  const s = remote();
  if (s) { const { error } = await s.from('community_replies').delete().eq('id', id); if (error) throw error; return; }
  const db = local();
  if (!db) throw new Error('Database not configured');
  await db.communityReply.deleteMany({ where: { id } });
}

export async function changeCommunityPost(id: string, ownerToken: string, status: 'resolved' | 'open') {
  const hash = hashOwner(ownerToken); const s = remote();
  if (s) { const { data, error } = await s.from('community_posts').update({ status }).eq('id', id).eq('owner_hash', hash).select('id'); if (error) throw error; return !!data?.length; }
  const db = local(); if (!db) return false;
  const result = await db.communityPost.updateMany({ where: { id, owner_hash: hash }, data: { status } }); return result.count > 0;
}

export async function deleteCommunityPost(id: string, ownerToken?: string) {
  const s = remote();
  if (s) { let query = s.from('community_posts').delete().eq('id', id); if (ownerToken) query = query.eq('owner_hash', hashOwner(ownerToken)); const { data, error } = await query.select('id'); if (error) throw error; return !!data?.length; }
  const db = local(); if (!db) return false;
  const where: Prisma.CommunityPostWhereInput = ownerToken ? { id, owner_hash: hashOwner(ownerToken) } : { id };
  const result = await db.communityPost.deleteMany({ where }); return result.count > 0;
}

export async function createCommunityReply(postId: string, fitterCode: string, body: string) {
  const fitter = await getFitterByDashboardCode(fitterCode);
  if (!fitter) return false;
  const record = { id: randomUUID(), post_id: postId, fitter_id: fitter.fitter_id, body, created_at: new Date().toISOString() };
  const s = remote();
  if (s) { const { error } = await s.from('community_replies').insert(record); if (error) throw error; return true; }
  const db = local(); if (!db) return false;
  await db.communityReply.create({ data: record }); return true;
}

export { hashOwner };
