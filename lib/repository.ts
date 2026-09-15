import { PrismaClient, Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import type { Fitter, Review, Contact, DispatchRequest } from '@/types';
type Table = 'fitters' | 'reviews' | 'contacts';
type Row = Fitter | Review | Contact;
const globalDb = globalThis as unknown as { db?: PrismaClient };
function local() {
  // On Vercel without Supabase configured, return null so callers can return empty data gracefully
  if (process.env.VERCEL && !process.env.SUPABASE_URL) return null;
  return (globalDb.db ??= new PrismaClient());
}
export function remote() {
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
  if (!p) return [];
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
  if (!p) return;
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
  if (!p) return;
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
  if (!p) return;
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
  if (!p) return false;
  const result = await p.$queryRaw<
    { count: number }[]
  >`INSERT INTO rate_limits (key,count,expires) VALUES (${key},1,${BigInt(expires)}) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<${BigInt(now)} THEN 1 ELSE count+1 END, expires=CASE WHEN expires<${BigInt(now)} THEN ${BigInt(expires)} ELSE expires END RETURNING count`;
  return result[0].count > max;
}
import { createHash, randomUUID } from 'node:crypto';
import { mockFitters } from './mock-data';
import { distance, opening } from './geo';

const ACTIVE = ['pending', 'accepted', 'en_route'];
const ONLINE_TTL = 90_000;
const hashCode = (code: string) => createHash('sha256').update(code).digest('hex');
const live = (row: { is_online: boolean; last_seen_at?: string | null }) =>
  row.is_online && !!row.last_seen_at && Date.parse(row.last_seen_at) > Date.now() - ONLINE_TTL;
function database() {
  const p = local();
  if (!p) throw new Error('Database not configured');
  return p;
}
export type PlatformSettings = { commission_percent: number; commission_fixed_iqd: number };
export type StoredDispatch = DispatchRequest & {
  active_slot: string | null;
  fitter_lat: number | null; fitter_lng: number | null;
  commission_percent: number; commission_fixed_iqd: number;
  final_price_iqd: number | null; commission_iqd: number | null; commission_status: string;
};
export async function platformSettings(): Promise<PlatformSettings> {
  const s = remote();
  if (s) {
    const { data, error } = await s.from('platform_settings').select('commission_percent,commission_fixed_iqd').eq('id', 'platform').maybeSingle();
    if (error) throw error;
    return data ?? { commission_percent: 10, commission_fixed_iqd: 0 };
  }
  const data = await database().platformSetting.findUnique({ where: { id: 'platform' } });
  return data ?? { commission_percent: 10, commission_fixed_iqd: 0 };
}
export async function savePlatformSettings(data: PlatformSettings) {
  if (!Number.isFinite(data.commission_percent) || data.commission_percent < 0 || data.commission_percent > 100 ||
      !Number.isSafeInteger(data.commission_fixed_iqd) || data.commission_fixed_iqd < 0 || data.commission_fixed_iqd > 1_000_000)
    throw new Error('Invalid commission settings');
  const record = { ...data, id: 'platform', updated_at: new Date().toISOString() };
  const s = remote();
  if (s) {
    const { error } = await s.from('platform_settings').upsert(record);
    if (error) throw error;
  } else await database().platformSetting.upsert({ where: { id: 'platform' }, create: record, update: record });
}
export async function publicFitters(): Promise<Fitter[]> {
  const preview = process.env.VERCEL && !process.env.SUPABASE_URL;
  const [fitters, reviews, dashboards] = preview
    ? [mockFitters, [] as Review[], []]
    : await Promise.all([rows<Fitter>('fitters'), rows<Review>('reviews'), dashboardRows()]);
  return fitters.filter(f => f.status === 'approved').map(f => {
    const rs = preview ? ('reviews' in f ? f.reviews as Review[] : []) : reviews.filter(r => r.fitter_id === f.id && r.status === 'approved');
    const dashboard = dashboards.find(d => d.fitter_id === f.id);
    // Explicit allowlist: neither contacts nor dashboard secrets can reach public clients.
    return {
      id: f.id, name: f.name, type: f.type, photo_url: f.photo_url,
      latitude: f.type === 'mobile' && dashboard && live(dashboard) && dashboard.current_lat != null ? dashboard.current_lat : f.latitude,
      longitude: f.type === 'mobile' && dashboard && live(dashboard) && dashboard.current_lng != null ? dashboard.current_lng : f.longitude,
      neighborhood: f.neighborhood, services: f.services, working_hours: f.working_hours,
      status: f.status, demo: f.demo, created_at: f.created_at,
      rating: rs.length ? rs.reduce((sum, r) => sum + r.rating, 0) / rs.length : 0,
      review_count: rs.length, is_online: !!dashboard && live(dashboard),
    } as Fitter;
  });
}
async function dashboardRows() {
  const s = remote();
  if (s) {
    const { data, error } = await s.from('fitter_dashboards').select('fitter_id,is_online,current_lat,current_lng,last_seen_at');
    if (error) throw error;
    return data ?? [];
  }
  return database().fitterDashboard.findMany({ select: { fitter_id: true, is_online: true, current_lat: true, current_lng: true, last_seen_at: true } });
}
export async function dispatchCandidates(lat: number, lng: number, options: { tried?: string[]; fitter_id?: string; service?: string; type?: string } = {}) {
  await expireOldDispatches();
  const [fitters, busy] = await Promise.all([publicFitters(), getActiveFitterIds()]);
  return fitters.filter(f => {
    if (options.fitter_id) return f.id === options.fitter_id && distance([lat, lng], [f.latitude, f.longitude]) <= 35;
    return f.is_online && !busy.has(f.id) &&
      !options.tried?.includes(f.id) &&
      (!options.type || options.type === f.type) && (!options.service || f.services.includes(options.service)) &&
      opening(f.working_hours).open && distance([lat, lng], [f.latitude, f.longitude]) <= 35;
  })
    .sort((a, b) => distance([lat, lng], [a.latitude, a.longitude]) - distance([lat, lng], [b.latitude, b.longitude]));
}
export function isReservationConflict(e: unknown) {
  return !!e && typeof e === 'object' && 'code' in e && (e.code === 'P2002' || e.code === '23505');
}
export async function createDispatch(data: DispatchRequest): Promise<void> {
  const record = { ...data, active_slot: data.fitter_id };
  const s = remote();
  if (s) {
    const { error } = await s.from('dispatch_requests').insert(record);
    if (error) throw error;
  } else await database().dispatchRequest.create({ data: record });
}
async function dispatchWhere(column: 'id' | 'user_token' | 'fitter_token', value: string): Promise<StoredDispatch | null> {
  const s = remote();
  if (s) {
    const { data, error } = await s.from('dispatch_requests').select('*').eq(column, value).maybeSingle();
    if (error) throw error;
    return data as StoredDispatch | null;
  }
  return database().dispatchRequest.findFirst({ where: { [column]: value } }) as unknown as Promise<StoredDispatch | null>;
}
async function fitterName(id: string) {
  const s = remote();
  if (s) {
    const { data, error } = await s.from('fitters').select('name').eq('id', id).maybeSingle();
    if (error) throw error;
    return data?.name ?? '';
  }
  return (await database().fitter.findUnique({ where: { id }, select: { name: true } }))?.name ?? '';
}
export async function getDispatchByUserToken(token: string) {
  await expireOldDispatches();
  const r = await dispatchWhere('user_token', token);
  if (!r) return null;
  return {
    id: r.id, status: r.status, fitter_name: await fitterName(r.fitter_id),
    reassign_count: r.reassign_count, expires_at: r.expires_at, created_at: r.created_at,
    accepted_at: r.accepted_at, completed_at: r.completed_at,
    user_lat: r.user_lat, user_lng: r.user_lng,
    final_price_iqd: r.final_price_iqd, commission_iqd: r.commission_iqd,
  };
}
export async function getDispatchByFitterToken(token: string) {
  await expireOldDispatches();
  const r = await dispatchWhere('fitter_token', token);
  if (!r) return null;
  return {
    id: r.id, fitter_id: r.fitter_id, user_lat: r.user_lat, user_lng: r.user_lng,
    user_note: r.user_note, status: r.status, fitter_token: r.fitter_token,
    expires_at: r.expires_at, created_at: r.created_at, fitter_name: await fitterName(r.fitter_id),
    commission_percent: r.commission_percent, commission_fixed_iqd: r.commission_fixed_iqd,
  };
}
export async function getPendingDispatchForFitter(fitter_id: string) {
  await expireOldDispatches();
  const s = remote();
  let r: StoredDispatch | null;
  if (s) {
    const { data, error } = await s.from('dispatch_requests').select('*').eq('fitter_id', fitter_id).in('status', ACTIVE).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    r = data;
  } else r = await database().dispatchRequest.findFirst({ where: { fitter_id, status: { in: ACTIVE } }, orderBy: { created_at: 'desc' } }) as StoredDispatch | null;
  if (!r) return null;
  return {
    id: r.id, user_lat: r.user_lat, user_lng: r.user_lng, user_note: r.user_note,
    user_phone: ['accepted', 'en_route'].includes(r.status) ? r.user_phone : null,
    fitter_token: r.fitter_token, expires_at: r.expires_at, created_at: r.created_at, status: r.status,
    commission_percent: r.commission_percent, commission_fixed_iqd: r.commission_fixed_iqd,
  };
}
// All state transitions compare status and token in the same write. active_slot has a
// database unique constraint, so two customers can never reserve the same fitter.
export async function transitionDispatch(
  token: string, actor: 'user' | 'fitter', expected: string[], status: string,
  extra: Partial<Pick<StoredDispatch, 'accepted_at' | 'completed_at' | 'commission_percent' | 'commission_fixed_iqd' | 'final_price_iqd' | 'commission_iqd' | 'commission_status' | 'fitter_id' | 'fitter_token' | 'tried_fitters' | 'reassign_count' | 'expires_at'>> = {},
): Promise<boolean> {
  const column = actor === 'user' ? 'user_token' : 'fitter_token';
  const record = { status, ...extra, ...(!ACTIVE.includes(status) ? { active_slot: null } : extra.fitter_id ? { active_slot: extra.fitter_id } : {}) };
  const now = new Date().toISOString();
  const s = remote();
  if (s) {
    let query = s.from('dispatch_requests').update(record).eq(column, token).in('status', expected);
    if (status === 'accepted') query = query.gt('expires_at', now);
    const { data, error } = await query.select('id');
    if (error) throw error;
    return !!data?.length;
  }
  const result = await database().dispatchRequest.updateMany({
    where: { [column]: token, status: { in: expected }, ...(status === 'accepted' ? { expires_at: { gt: now } } : {}) },
    data: record,
  });
  return result.count > 0;
}
export async function getDispatchById(id: string) { return dispatchWhere('id', id); }
export async function expireOldDispatches(): Promise<void> {
  const now = new Date().toISOString();
  const s = remote();
  if (s) {
    const { error } = await s.from('dispatch_requests').update({ status: 'expired', active_slot: null }).eq('status', 'pending').lte('expires_at', now);
    if (error) throw error;
  } else if (local()) await database().dispatchRequest.updateMany({ where: { status: 'pending', expires_at: { lte: now } }, data: { status: 'expired', active_slot: null } });
}
export async function createFitterDashboard(fitter_id: string, code: string): Promise<void> {
  const record = { code: hashCode(code), is_online: false, current_lat: null, current_lng: null, last_seen_at: null };
  const s = remote();
  if (s) {
    const { error } = await s.from('fitter_dashboards').upsert({ id: randomUUID(), fitter_id, created_at: new Date().toISOString(), ...record }, { onConflict: 'fitter_id' });
    if (error) throw error;
  } else await database().fitterDashboard.upsert({ where: { fitter_id }, create: { id: randomUUID(), fitter_id, created_at: new Date().toISOString(), ...record }, update: record });
}
export async function getFitterByDashboardCode(code: string) {
  if (!code || code.trim().length === 0) return null;
  const s = remote();
  if (s) {
    const { data, error } = await s.from('fitter_dashboards').select('fitter_id,is_online,last_seen_at,fitters(name,type,status)').eq('code', hashCode(code)).maybeSingle();
    if (error) throw error;
    const f = data?.fitters as unknown as { name: string; type: string; status: string } | undefined;
    if (!data || !f || f.status !== 'approved') return null;
    return { fitter_id: data.fitter_id, fitter_name: f.name, fitter_type: f.type, is_online: live(data) };
  }
  const r = await database().fitterDashboard.findUnique({ where: { code: hashCode(code) }, include: { fitter: { select: { name: true, type: true, status: true } } } });
  if (!r || r.fitter.status !== 'approved') return null;
  return { fitter_id: r.fitter_id, fitter_name: r.fitter.name, fitter_type: r.fitter.type, is_online: live(r) };
}
export async function updateFitterOnlineStatus(fitter_id: string, is_online: boolean, lat?: number, lng?: number): Promise<void> {
  const record = { is_online, last_seen_at: new Date().toISOString(), ...(!is_online ? { current_lat: null, current_lng: null } : lat != null && lng != null ? { current_lat: lat, current_lng: lng } : {}) };
  const s = remote();
  if (s) {
    const { error } = await s.from('fitter_dashboards').update(record).eq('fitter_id', fitter_id);
    if (error) throw error;
  } else await database().fitterDashboard.update({ where: { fitter_id }, data: record });
}
export async function updateDispatchFitterLocation(fitter_token: string, lat: number, lng: number): Promise<void> {
  const s = remote();
  if (s) {
    const { error } = await s.from('dispatch_requests').update({ fitter_lat: lat, fitter_lng: lng }).eq('fitter_token', fitter_token).in('status', ['accepted', 'en_route']);
    if (error) throw error;
  } else await database().dispatchRequest.updateMany({ where: { fitter_token, status: { in: ['accepted', 'en_route'] } }, data: { fitter_lat: lat, fitter_lng: lng } });
}
export async function getDispatchFitterLocation(user_token: string) {
  const r = await dispatchWhere('user_token', user_token);
  if (!r) return null;
  const track = ['accepted', 'en_route'].includes(r.status);
  return { fitter_lat: track ? r.fitter_lat : null, fitter_lng: track ? r.fitter_lng : null, status: r.status, fitter_name: await fitterName(r.fitter_id) };
}
export async function getActiveFitterIds(): Promise<Set<string>> {
  await expireOldDispatches();
  const s = remote();
  if (s) {
    const { data, error } = await s.from('dispatch_requests').select('fitter_id').in('status', ACTIVE);
    if (error) throw error;
    return new Set((data ?? []).map(r => r.fitter_id));
  }
  if (!local()) return new Set();
  return new Set((await database().dispatchRequest.findMany({ where: { status: { in: ACTIVE } }, select: { fitter_id: true } })).map(r => r.fitter_id));
}
export async function dispatchHistory(fitter_id?: string) {
  const s = remote();
  let data;
  if (s) {
    let query = s.from('dispatch_requests').select('id,fitter_id,status,created_at,accepted_at,completed_at,commission_percent,commission_fixed_iqd,final_price_iqd,commission_iqd,commission_status').order('created_at', { ascending: false }).limit(200);
    if (fitter_id) query = query.eq('fitter_id', fitter_id);
    const result = await query;
    if (result.error) throw result.error;
    data = result.data ?? [];
  } else data = await database().dispatchRequest.findMany({ where: fitter_id ? { fitter_id } : {}, orderBy: { created_at: 'desc' }, take: 200, select: { id: true, fitter_id: true, status: true, created_at: true, accepted_at: true, completed_at: true, commission_percent: true, commission_fixed_iqd: true, final_price_iqd: true, commission_iqd: true, commission_status: true } });
  return data;
}
