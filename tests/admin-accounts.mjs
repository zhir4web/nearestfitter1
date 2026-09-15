import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
if (!process.env.DATABASE_URL?.endsWith('qa-admin.db'))
  throw Error('Use isolated qa-admin.db only.');
const db = new PrismaClient(),
  base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3200';
let cookie = '',
  fitterId;
const codes = new Map(),
  testClient = 'qa-' + randomUUID();
async function request(
  path,
  body,
  method = body ? 'POST' : 'GET',
  admin = true,
  origin = base,
) {
  const headers = {
    Origin: origin,
    'x-forwarded-for': testClient,
    ...(admin ? { Cookie: cookie } : {}),
  };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return fetch(base + '/api' + path, { method, headers, body: payload });
}
async function json(r) {
  assert.ok(r.ok, `${r.status}: ${await r.clone().text()}`);
  return r.json();
}
const settings = (fee) =>
  request('/admin/settings', { commission_fixed_iqd: fee }, 'PATCH');
async function snapshot() {
  return json(await request('/admin/data'));
}
async function book() {
  const booking = await json(
    await request('/dispatch', {
      user_lat: 35.561,
      user_lng: 45.431,
      user_phone: '+9647700000001',
      user_note: 'QA puncture',
      fitter_id: fitterId,
    }),
  );
  const dash = await json(
    await request(
      '/fitter/dashboard/' + codes.get(fitterId),
      undefined,
      'GET',
      false,
    ),
  );
  return { booking, token: dash.request.fitter_token };
}
const accept = (token) =>
  request(
    '/dispatch/accept/' + token,
    { fitter_code: codes.get(fitterId), action: 'accept' },
    'POST',
    false,
  );
const complete = (token) =>
  request(
    '/dispatch/accept/' + token,
    { fitter_code: codes.get(fitterId), action: 'complete' },
    'POST',
    false,
  );
function pass(s) {
  console.log('PASS', s);
}
try {
  assert.equal(
    (await request('/admin/accounts?fitter_id=x', undefined, 'GET', false))
      .status,
    401,
  );
  assert.equal(
    (await request('/admin/accounts', { fitter_id: 'x' }, 'POST', false))
      .status,
    401,
  );
  const login = await request('/admin/session', {
    password: process.env.TEST_ADMIN_PASSWORD,
  });
  await json(login);
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await settings(-1)).status, 400);
  assert.equal((await settings(1.5)).status, 400);
  assert.equal((await settings(1000001)).status, 400);
  await json(await settings(5000));
  assert.equal((await snapshot()).settings.commission_percent, 0);
  pass('Authenticated settings store fixed fee; invalid amounts rejected');
  const hours = Array.from({ length: 7 }, () => ({
    closed: false,
    allDay: true,
    open: '00:00',
    close: '23:59',
  }));
  const form = new FormData();
  form.set(
    'data',
    JSON.stringify({
      name: 'QA admin fitter',
      type: 'mobile',
      phone: '+9647700000000',
      phone2: '',
      whatsapp: '',
      latitude: 35.56,
      longitude: 45.43,
      neighborhood: 'QA',
      services: ['puncture'],
      working_hours: hours,
      website: '',
      status: 'approved',
      demo: false,
    }),
  );
  const created = await json(await request('/admin/fitters', form));
  fitterId = created.id;
  codes.set(fitterId, created.dashboard_code);
  assert.ok(created.dashboard_code);
  assert.ok(
    await db.fitterDashboard.findUnique({ where: { fitter_id: fitterId } }),
  );
  form.set(
    'data',
    JSON.stringify({
      ...JSON.parse(form.get('data')),
      id: fitterId,
      name: 'QA updated fitter',
    }),
  );
  await json(await request('/admin/fitters', form));
  assert.equal(
    (await json(await request('/fitters', undefined, 'GET', false))).find(
      (f) => f.id === fitterId,
    ).name,
    'QA updated fitter',
  );
  await json(
    await request(
      '/fitter/location',
      {
        fitter_code: codes.get(fitterId),
        is_online: true,
        lat: 35.56,
        lng: 45.43,
      },
      'POST',
      false,
    ),
  );
  pass(
    'Admin fitter creation and edit reach database, public directory, and fitter dashboard',
  );
  const first = await book();
  const concurrent = await Promise.all([
    accept(first.token),
    accept(first.token),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await accept(first.token)).status, 409);
  let a = (await snapshot()).accounts.find((a) => a.fitter_id === fitterId);
  assert.equal(a.accepted_count, 1);
  assert.equal(a.current_count, 1);
  assert.equal(a.outstanding_iqd, 5000);
  assert.equal(
    await db.accountCharge.count({ where: { fitter_id: fitterId } }),
    1,
  );
  await json(await settings(7000));
  await json(await complete(first.token));
  assert.equal(
    (
      await json(
        await request(
          '/fitter/dashboard/' + codes.get(fitterId),
          undefined,
          'GET',
          false,
        ),
      )
    ).jobs[0].commission_iqd,
    5000,
  );
  pass(
    'Charge created at accept exactly once; fee change and completion preserve old charge',
  );
  const receiptId = randomUUID(),
    body = {
      fitter_id: fitterId,
      receipt_id: receiptId,
      note: 'QA settlement',
      expected_amount: 5000,
      expected_count: 1,
    };
  assert.equal(
    (
      await request(
        '/admin/accounts',
        body,
        'POST',
        true,
        'https://other.example',
      )
    ).status,
    403,
  );
  assert.equal(
    (await request('/admin/accounts', { ...body, expected_amount: 4000 }))
      .status,
    409,
  );
  const receipt = await json(await request('/admin/accounts', body));
  assert.equal(receipt.amount_iqd, 5000);
  const repeated = await json(await request('/admin/accounts', body));
  assert.equal(repeated.id, receipt.id);
  a = (await snapshot()).accounts.find((a) => a.fitter_id === fitterId);
  assert.equal(a.outstanding_iqd, 0);
  assert.equal(a.current_count, 0);
  assert.equal(a.accepted_count, 1);
  assert.equal(a.completed_count, 1);
  assert.equal(a.settled_iqd, 5000);
  assert.equal(
    await db.accountSettlement.count({ where: { fitter_id: fitterId } }),
    1,
  );
  const synced = await json(
    await request(
      '/fitter/dashboard/' + codes.get(fitterId),
      undefined,
      'GET',
      false,
    ),
  );
  assert.equal(synced.account.outstanding_iqd, 0);
  assert.equal(synced.jobs[0].commission_status, 'settled');
  assert.equal(
    (await request('/admin/accounts', { ...body, receipt_id: randomUUID() }))
      .status,
    409,
  );
  pass(
    'Settlement zeros current account, retains history, rejects stale/empty settlement, and is idempotent',
  );
  const second = await book();
  await json(await accept(second.token));
  await json(
    await request(
      '/dispatch/' + second.booking.user_token,
      { action: 'cancel' },
      'POST',
      false,
    ),
  );
  a = (await snapshot()).accounts.find((a) => a.fitter_id === fitterId);
  assert.equal(a.outstanding_iqd, 7000);
  assert.equal(a.accepted_count, 2);
  assert.equal(a.completed_count, 1);
  assert.equal(a.settled_iqd, 5000);
  pass(
    'New acceptance starts fresh balance; cancellation does not erase acceptance fee',
  );
  const legacyId = randomUUID();
  await db.dispatchRequest.create({
    data: {
      id: legacyId,
      fitter_id: fitterId,
      user_lat: 35.56,
      user_lng: 45.43,
      user_phone: 'private',
      status: 'completed',
      fitter_token: randomUUID(),
      user_token: randomUUID(),
      created_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
      commission_iqd: 3000,
      commission_status: 'due',
    },
  });
  await snapshot();
  await snapshot();
  assert.equal(
    await db.accountCharge.count({ where: { dispatch_id: legacyId } }),
    1,
  );
  a = (await snapshot()).accounts.find((a) => a.fitter_id === fitterId);
  assert.equal(a.outstanding_iqd, 10000);
  pass('Legacy recorded balances are imported without duplicate fees');
  // More than 200 historical jobs proves totals do not use the recent-history limit.
  for (let i = 0; i < 205; i++)
    await db.dispatchRequest.create({
      data: {
        id: randomUUID(),
        fitter_id: fitterId,
        user_lat: 35.56,
        user_lng: 45.43,
        user_phone: 'private',
        status: 'completed',
        fitter_token: randomUUID(),
        user_token: randomUUID(),
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      },
    });
  a = (await snapshot()).accounts.find((a) => a.fitter_id === fitterId);
  assert.equal(a.accepted_count, 208);
  assert.equal(a.completed_count, 207);
  assert.equal(a.outstanding_iqd, 10000);
  const detail = await json(
    await request('/admin/accounts?fitter_id=' + fitterId),
  );
  assert.equal(detail.charges.length, 3);
  assert.equal(detail.settlements.length, 1);
  assert.equal(
    (await request('/admin/fitters', { id: fitterId }, 'DELETE')).status,
    409,
  );
  pass(
    'All-time totals exceed 200 jobs; charge history cannot be deleted with fitter',
  );
  // Atomic rollback: preexisting unique charge forces acceptance to roll back too.
  const third = await book();
  const job = await db.dispatchRequest.findUnique({
    where: { fitter_token: third.token },
  });
  await db.accountCharge.create({
    data: {
      id: randomUUID(),
      dispatch_id: job.id,
      fitter_id: fitterId,
      amount_iqd: 0,
      created_at: new Date().toISOString(),
    },
  });
  assert.equal((await accept(third.token)).status, 500);
  assert.equal(
    (await db.dispatchRequest.findUnique({ where: { id: job.id } })).status,
    'pending',
  );
  pass('Acceptance rolls back if financial entry cannot be recorded');
  const logout = await request('/admin/session', undefined, 'DELETE');
  await json(logout);
  assert.ok(logout.headers.get('set-cookie').startsWith('nf_session=;'));
  cookie = '';
  assert.equal((await request('/admin/data')).status, 401);
  pass('Logout clears browser session; unauthenticated requests reject');
} finally {
  if (fitterId) {
    await db.accountCharge.deleteMany({ where: { fitter_id: fitterId } });
    await db.accountSettlement.deleteMany({ where: { fitter_id: fitterId } });
    await db.fitter.delete({ where: { id: fitterId } });
  }
  await db.$disconnect();
}
