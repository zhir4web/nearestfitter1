import { randomUUID } from 'node:crypto';
import { database, remote } from './repository';
import { HttpError } from './security';
import type {
  AccountSummary,
  AccountCharge,
  AccountSettlement,
} from '@/types/accounts';

// Acceptance and its charge commit together. A unique dispatch_id forbids double billing.
export async function acceptWithCharge(token: string, fitter_id: string) {
  const s = remote();
  if (s) {
    const { data, error } = await s.rpc('accept_dispatch_with_charge', {
      p_token: token,
      p_fitter_id: fitter_id,
    });
    if (error) throw error;
    return data === true;
  }
  return database().$transaction(async (tx) => {
    const fee =
      (await tx.platformSetting.findUnique({ where: { id: 'platform' } }))
        ?.commission_fixed_iqd ?? 0;
    const now = new Date().toISOString();
    const result = await tx.dispatchRequest.updateMany({
      where: {
        fitter_token: token,
        fitter_id,
        status: 'pending',
        expires_at: { gt: now },
      },
      data: {
        status: 'accepted',
        accepted_at: now,
        commission_percent: 0,
        commission_fixed_iqd: fee,
        commission_iqd: fee,
        commission_status: 'due',
      },
    });
    if (!result.count) return false;
    const job = await tx.dispatchRequest.findUniqueOrThrow({
      where: { fitter_token: token },
    });
    await tx.accountCharge.create({
      data: {
        id: job.id,
        dispatch_id: job.id,
        fitter_id,
        amount_iqd: fee,
        created_at: now,
      },
    });
    return true;
  });
}

// Import only already recorded unpaid legacy charges; never invent retrospective fees.
export async function importLegacyCharges() {
  const s = remote();
  if (s) {
    const { error } = await s.rpc('import_legacy_account_charges');
    if (error) throw error;
    return;
  }
  await database()
    .$executeRaw`INSERT OR IGNORE INTO account_charges (id,dispatch_id,fitter_id,amount_iqd,created_at)
    SELECT id,id,fitter_id,commission_iqd,accepted_at FROM dispatch_requests
    WHERE accepted_at IS NOT NULL AND commission_iqd IS NOT NULL AND commission_status = 'due'`;
}

// Paginate Supabase internally: accounting must not silently stop at 200/1000 jobs.
async function allRemote<T>(
  table: string,
  fields: string,
  column?: string,
  value?: string,
): Promise<T[]> {
  const result: T[] = [];
  const s = remote()!;
  for (let offset = 0; ; offset += 1000) {
    let query = s
      .from(table)
      .select(fields)
      .order('id')
      .range(offset, offset + 999);
    if (column) query = query.eq(column, value!);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...(data as unknown as T[]));
    if (!data || data.length < 1000) return result;
  }
}
export async function accountSummaries(
  fitter_id?: string,
): Promise<AccountSummary[]> {
  await importLegacyCharges();
  const s = remote();
  type Job = { fitter_id: string; status: string; accepted_at: string | null };
  const [jobs, charges] = s
    ? await Promise.all([
        allRemote<Job>(
          'dispatch_requests',
          'id,fitter_id,status,accepted_at',
          fitter_id ? 'fitter_id' : undefined,
          fitter_id,
        ),
        allRemote<AccountCharge>(
          'account_charges',
          '*',
          fitter_id ? 'fitter_id' : undefined,
          fitter_id,
        ),
      ])
    : await Promise.all([
        database().dispatchRequest.findMany({
          where: fitter_id ? { fitter_id } : {},
          select: { fitter_id: true, status: true, accepted_at: true },
        }),
        database().accountCharge.findMany({
          where: fitter_id ? { fitter_id } : {},
        }),
      ]);
  const map = new Map<string, AccountSummary>();
  function get(id: string) {
    if (!map.has(id))
      map.set(id, {
        fitter_id: id,
        accepted_count: 0,
        completed_count: 0,
        current_count: 0,
        outstanding_iqd: 0,
        settled_iqd: 0,
        total_iqd: 0,
        last_accepted_at: null,
      });
    return map.get(id)!;
  }
  for (const job of jobs) {
    const a = get(job.fitter_id);
    if (job.accepted_at) {
      a.accepted_count++;
      if (!a.last_accepted_at || job.accepted_at > a.last_accepted_at)
        a.last_accepted_at = job.accepted_at;
    }
    if (job.status === 'completed') a.completed_count++;
  }
  for (const charge of charges) {
    const a = get(charge.fitter_id);
    a.total_iqd += charge.amount_iqd;
    if (charge.settlement_id) a.settled_iqd += charge.amount_iqd;
    else {
      a.outstanding_iqd += charge.amount_iqd;
      a.current_count++;
    }
  }
  return [...map.values()];
}
export async function accountDetail(fitter_id: string) {
  await importLegacyCharges();
  const s = remote();
  const [charges, settlements] = s
    ? await Promise.all([
        allRemote<AccountCharge>(
          'account_charges',
          '*',
          'fitter_id',
          fitter_id,
        ),
        allRemote<AccountSettlement>(
          'account_settlements',
          '*',
          'fitter_id',
          fitter_id,
        ),
      ])
    : await Promise.all([
        database().accountCharge.findMany({ where: { fitter_id } }),
        database().accountSettlement.findMany({ where: { fitter_id } }),
      ]);
  return {
    charges: charges.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    settlements: settlements.sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    ),
  };
}
export async function settleAccount(
  fitter_id: string,
  id: string = randomUUID(),
  note = '',
  expected_amount: number,
  expected_count: number,
) {
  await importLegacyCharges();
  const s = remote();
  if (s) {
    const { data, error } = await s.rpc('settle_fitter_account', {
      p_fitter_id: fitter_id,
      p_id: id,
      p_note: note,
      p_expected_amount: expected_amount,
      p_expected_count: expected_count,
    });
    if (error) {
      if (error.code === 'P0001') throw new HttpError(409, error.message);
      throw error;
    }
    return data as AccountSettlement;
  }
  return database().$transaction(async (tx) => {
    const existing = await tx.accountSettlement.findUnique({ where: { id } });
    if (existing) {
      if (existing.fitter_id !== fitter_id)
        throw new HttpError(409, 'Invalid receipt');
      return existing;
    }
    if (!(await tx.fitter.findUnique({ where: { id: fitter_id } })))
      throw new HttpError(404, 'Fitter not found');
    const charges = await tx.accountCharge.findMany({
      where: { fitter_id, settlement_id: null },
    });
    const amount = charges.reduce((sum, c) => sum + c.amount_iqd, 0);
    if (!charges.length)
      throw new HttpError(409, 'There is no unsettled account');
    if (expected_amount !== amount || expected_count !== charges.length)
      throw new HttpError(409, 'The account changed. Refresh before settling.');
    const record = await tx.accountSettlement.create({
      data: {
        id,
        fitter_id,
        amount_iqd: amount,
        job_count: charges.length,
        note,
        created_at: new Date().toISOString(),
      },
    });
    await tx.accountCharge.updateMany({
      where: { id: { in: charges.map((c) => c.id) }, settlement_id: null },
      data: { settlement_id: id },
    });
    await tx.dispatchRequest.updateMany({
      where: { id: { in: charges.map((c) => c.dispatch_id) } },
      data: { commission_status: 'settled' },
    });
    return record;
  });
}
