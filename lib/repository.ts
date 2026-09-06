import { PrismaClient, Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import type { Fitter, Review, Contact, DispatchRequest } from '@/types';
type Table = 'fitters' | 'reviews' | 'contacts';
type Row = Fitter | Review | Contact;
const globalDb = globalThis as unknown as { db?: PrismaClient };
function local() {
  if (process.env.VERCEL)
    throw Error('Configure Supabase for Vercel; local SQLite is not durable.');
  return (globalDb.db ??= new PrismaClient());
}
function remote() {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null;
}
export const supabase = remote;
export async function rows<T extends Row>(table: Table): Promise<T[]> {
  const s = remote();
  if (s) {
    const { data, error } = await s
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as T[];
  }
  const p = local();
  const data =
    table === 'fitters'
      ? await p.fitter.findMany({ orderBy: { created_at: 'desc' } })
      : table === 'reviews'
        ? await p.review.findMany({ orderBy: { created_at: 'desc' } })
        : await p.contact.findMany({ orderBy: { created_at: 'desc' } });
  return data as unknown as T[];
}
export async function insert(table: Table, data: Row) {
  const s = remote();
  if (s) {
    const { error } = await s
      .from(table)
      .insert(data as unknown as Record<string, unknown>);
    if (error) throw error;
    return;
  }
  const p = local();
  if (table === 'fitters')
    await p.fitter.create({ data: data as Prisma.FitterCreateInput });
  else if (table === 'reviews')
    await p.review.create({ data: data as Prisma.ReviewUncheckedCreateInput });
  else await p.contact.create({ data: data as Prisma.ContactCreateInput });
}
export async function update(table: Table, id: string, data: Partial<Row>) {
  const s = remote();
  if (s) {
    const { error } = await s.from(table).update(data).eq('id', id);
    if (error) throw error;
    return;
  }
  const p = local();
  if (table === 'fitters')
    await p.fitter.update({
      where: { id },
      data: data as Prisma.FitterUpdateInput,
    });
  else if (table === 'reviews')
    await p.review.update({
      where: { id },
      data: data as Prisma.ReviewUpdateInput,
    });
  else
    await p.contact.update({
      where: { id },
      data: data as Prisma.ContactUpdateInput,
    });
}
export async function remove(table: Table, id: string) {
  const s = remote();
  if (s) {
    const { error } = await s.from(table).delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const p = local();
  if (table === 'fitters') await p.fitter.delete({ where: { id } });
  else if (table === 'reviews') await p.review.delete({ where: { id } });
  else await p.contact.delete({ where: { id } });
}
export async function hitLimit(key: string, max: number, windowMs: number) {
  const now = Date.now(),
    expires = now + windowMs,
    s = remote();
  if (s) {
    const { data, error } = await s.rpc('hit_rate_limit', {
      p_key: key,
      p_now: now,
      p_expires: expires,
    });
    if (error) throw error;
    return Number(data) > max;
  }
  const p = local();
  const result = await p.$queryRaw<
    { count: number }[]
  >`INSERT INTO rate_limits (key,count,expires) VALUES (${key},1,${BigInt(expires)}) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<${BigInt(now)} THEN 1 ELSE count+1 END, expires=CASE WHEN expires<${BigInt(now)} THEN ${BigInt(expires)} ELSE expires END RETURNING count`;
  return result[0].count > max;
}
export async function publicFitters() {
  const [fitters, reviews] = await Promise.all([
    rows<Fitter>('fitters'),
    rows<Review>('reviews'),
  ]);
  return fitters
    .filter((f) => f.status === 'approved')
    .map((f) => {
      const rs = reviews.filter(
        (r) => r.fitter_id === f.id && r.status === 'approved',
      );
      return {
        ...f,
        review_count: rs.length,
        rating: rs.length
          ? rs.reduce((a, r) => a + r.rating, 0) / rs.length
          : 0,
      };
    });
}
export async function createDispatch(
  data: DispatchRequest,
): Promise<void> {
  const p = local();
  await p.dispatchRequest.create({
    data: {
      id: data.id,
      fitter_id: data.fitter_id,
      user_lat: data.user_lat,
      user_lng: data.user_lng,
      status: data.status,
      fitter_token: data.fitter_token,
      user_token: data.user_token,
      created_at: data.created_at,
      accepted_at: data.accepted_at ?? null,
    },
  });
}
export async function getDispatchByUserToken(
  token: string,
): Promise<(DispatchRequest & { fitter_name: string; fitter_phone: string; fitter_whatsapp: string }) | null> {
  const p = local();
  const r = await p.dispatchRequest.findUnique({
    where: { user_token: token },
    include: { fitter: true },
  });
  if (!r) return null;
  return {
    id: r.id,
    fitter_id: r.fitter_id,
    user_lat: r.user_lat,
    user_lng: r.user_lng,
    status: r.status as DispatchRequest['status'],
    fitter_token: r.fitter_token,
    user_token: r.user_token,
    created_at: r.created_at,
    accepted_at: r.accepted_at ?? undefined,
    fitter_name: r.fitter.name,
    fitter_phone: r.fitter.phone,
    fitter_whatsapp: r.fitter.whatsapp,
  };
}
export async function getDispatchByFitterToken(
  token: string,
): Promise<(DispatchRequest & { fitter_name: string; fitter_phone: string }) | null> {
  const p = local();
  const r = await p.dispatchRequest.findUnique({
    where: { fitter_token: token },
    include: { fitter: true },
  });
  if (!r) return null;
  return {
    id: r.id,
    fitter_id: r.fitter_id,
    user_lat: r.user_lat,
    user_lng: r.user_lng,
    status: r.status as DispatchRequest['status'],
    fitter_token: r.fitter_token,
    user_token: r.user_token,
    created_at: r.created_at,
    accepted_at: r.accepted_at ?? undefined,
    fitter_name: r.fitter.name,
    fitter_phone: r.fitter.phone,
  };
}
export async function updateDispatchStatus(
  id: string,
  status: string,
  accepted_at?: string,
): Promise<void> {
  const p = local();
  await p.dispatchRequest.update({
    where: { id },
    data: { status, ...(accepted_at ? { accepted_at } : {}) },
  });
}
export async function expireOldDispatches(): Promise<void> {
  const p = local();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await p.dispatchRequest.updateMany({
    where: { status: 'pending', created_at: { lt: cutoff } },
    data: { status: 'expired' },
  });
}
