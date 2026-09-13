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
export async function createDispatch(data: DispatchRequest): Promise<void> {
  const p = local();
  await p.dispatchRequest.create({
    data: {
      id: data.id,
      fitter_id: data.fitter_id,
      user_lat: data.user_lat,
      user_lng: data.user_lng,
      user_phone: data.user_phone,
      user_note: data.user_note,
      status: data.status,
      fitter_token: data.fitter_token,
      user_token: data.user_token,
      tried_fitters: data.tried_fitters,
      reassign_count: data.reassign_count,
      expires_at: data.expires_at,
      created_at: data.created_at,
    },
  });
}
// For user polling — never exposes user_phone or fitter contact
export async function getDispatchByUserToken(token: string): Promise<{
  id: string; status: string; fitter_name: string;
  reassign_count: number; expires_at: string; created_at: string;
} | null> {
  const p = local();
  const r = await p.dispatchRequest.findUnique({
    where: { user_token: token },
    include: { fitter: { select: { name: true } } },
  });
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    fitter_name: r.fitter.name,
    reassign_count: r.reassign_count,
    expires_at: r.expires_at,
    created_at: r.created_at,
  };
}
// For fitter dashboard — shows location but NOT user phone
export async function getDispatchByFitterToken(token: string): Promise<{
  id: string; user_lat: number; user_lng: number; user_note: string;
  status: string; fitter_token: string; expires_at: string; created_at: string;
  fitter_name: string; fitter_whatsapp: string;
} | null> {
  const p = local();
  const r = await p.dispatchRequest.findUnique({
    where: { fitter_token: token },
    include: { fitter: { select: { name: true, whatsapp: true } } },
  });
  if (!r) return null;
  return {
    id: r.id,
    user_lat: r.user_lat,
    user_lng: r.user_lng,
    user_note: r.user_note,
    status: r.status,
    fitter_token: r.fitter_token,
    expires_at: r.expires_at,
    created_at: r.created_at,
    fitter_name: r.fitter.name,
    fitter_whatsapp: r.fitter.whatsapp,
  };
}
// For fitter dashboard page — gets pending OR accepted requests for this fitter
export async function getPendingDispatchForFitter(fitter_id: string): Promise<{
  id: string; user_lat: number; user_lng: number; user_note: string;
  fitter_token: string; expires_at: string; created_at: string; status: string;
} | null> {
  const p = local();
  const r = await p.dispatchRequest.findFirst({
    where: { fitter_id, status: { in: ['pending', 'accepted'] } },
    orderBy: { created_at: 'desc' },
  });
  if (!r) return null;
  return {
    id: r.id,
    user_lat: r.user_lat,
    user_lng: r.user_lng,
    user_note: r.user_note,
    fitter_token: r.fitter_token,
    expires_at: r.expires_at,
    created_at: r.created_at,
    status: r.status,
  };
}
export async function updateDispatchStatus(
  id: string, status: string,
  extra?: { accepted_at?: string; completed_at?: string; tried_fitters?: string; reassign_count?: number; fitter_id?: string; fitter_token?: string; expires_at?: string },
): Promise<void> {
  const p = local();
  await p.dispatchRequest.update({ where: { id }, data: { status, ...extra } });
}
export async function getDispatchById(id: string): Promise<(DispatchRequest & { fitter_whatsapp: string }) | null> {
  const p = local();
  const r = await p.dispatchRequest.findUnique({
    where: { id },
    include: { fitter: { select: { whatsapp: true } } },
  });
  if (!r) return null;
  return {
    id: r.id, fitter_id: r.fitter_id,
    user_lat: r.user_lat, user_lng: r.user_lng,
    user_phone: r.user_phone, user_note: r.user_note,
    status: r.status as DispatchRequest['status'],
    fitter_token: r.fitter_token, user_token: r.user_token,
    tried_fitters: r.tried_fitters, reassign_count: r.reassign_count,
    expires_at: r.expires_at, created_at: r.created_at,
    accepted_at: r.accepted_at ?? undefined,
    completed_at: r.completed_at ?? undefined,
    fitter_whatsapp: r.fitter.whatsapp,
  };
}
export async function expireOldDispatches(): Promise<void> {
  const p = local();
  const now = new Date().toISOString();
  await p.dispatchRequest.updateMany({
    where: { status: 'pending', expires_at: { lt: now } },
    data: { status: 'expired' },
  });
}
// FitterDashboard CRUD
export async function createFitterDashboard(fitter_id: string, code: string): Promise<void> {
  const p = local();
  await p.fitterDashboard.create({
    data: { id: code, fitter_id, code, created_at: new Date().toISOString() },
  });
}
export async function getFitterByDashboardCode(code: string): Promise<{
  fitter_id: string; fitter_name: string; fitter_type: string;
} | null> {
  const p = local();
  const r = await p.fitterDashboard.findUnique({
    where: { code },
    include: { fitter: { select: { id: true, name: true, type: true, status: true } } },
  });
  if (!r || r.fitter.status !== 'approved') return null;
  return { fitter_id: r.fitter.id, fitter_name: r.fitter.name, fitter_type: r.fitter.type };
}
// Update fitter's live GPS location and online status
export async function updateFitterOnlineStatus(
  fitter_id: string,
  is_online: boolean,
  lat?: number,
  lng?: number,
): Promise<void> {
  const p = local();
  await p.fitterDashboard.update({
    where: { fitter_id },
    data: {
      is_online,
      current_lat: lat ?? null,
      current_lng: lng ?? null,
    },
  });
}
// Update fitter location in an active dispatch request (for user tracking)
export async function updateDispatchFitterLocation(
  fitter_token: string,
  lat: number,
  lng: number,
): Promise<void> {
  const p = local();
  await p.dispatchRequest.update({
    where: { fitter_token },
    data: { fitter_lat: lat, fitter_lng: lng },
  });
}
// Get fitter live location from an accepted dispatch (for user polling)
export async function getDispatchFitterLocation(user_token: string): Promise<{
  fitter_lat: number | null;
  fitter_lng: number | null;
  status: string;
  fitter_name: string;
} | null> {
  const p = local();
  const r = await p.dispatchRequest.findUnique({
    where: { user_token },
    include: { fitter: { select: { name: true } } },
  });
  if (!r) return null;
  return {
    fitter_lat: r.fitter_lat,
    fitter_lng: r.fitter_lng,
    status: r.status,
    fitter_name: r.fitter.name,
  };
}
// Get active fitter IDs (to show busy badges in directory)
export async function getActiveFitterIds(): Promise<Set<string>> {
  const p = local();
  const active = await p.dispatchRequest.findMany({
    where: { status: { in: ['pending', 'accepted'] } },
    select: { fitter_id: true },
  });
  return new Set(active.map((r) => r.fitter_id));
}

