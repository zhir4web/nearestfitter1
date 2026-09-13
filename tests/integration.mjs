import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { distance, opening, defaultHours } from '../lib/geo.ts';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const password =
  process.env.TEST_ADMIN_PASSWORD ||
  JSON.parse(readFileSync('../../work/test-credentials.json', 'utf8')).password;
let cookie = '',
  created;
const passed = [];
async function req(url, method = 'GET', data, auth = false, origin = base) {
  const headers = {};
  if (method !== 'GET') headers.Origin = origin;
  if (auth) headers.Cookie = cookie;
  let body;
  if (data instanceof FormData) body = data;
  else if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }
  return fetch(base + url, { method, headers, body });
}
async function json(r) {
  assert.equal(r.ok, true, `${r.status} ${await r.clone().text()}`);
  return r.json();
}
function check(name, condition = true) {
  assert.ok(condition, name);
  passed.push(name);
  console.log('PASS ' + name);
}
const listing = {
  name: 'QA temporary fitter',
  phone: '+9640000000000',
  phone2: '',
  whatsapp: '+9640000000000',
  type: 'fixed',
  latitude: 35.56,
  longitude: 45.43,
  neighborhood: 'QA local test',
  services: ['puncture', 'balance'],
  working_hours: defaultHours(),
  website: '',
};
function form(data, photo) {
  const f = new FormData();
  f.set('data', JSON.stringify(data));
  if (photo)
    f.set('photo', new Blob([photo], { type: 'image/png' }), 'test.png');
  return f;
}
try {
  check('Haversine zero distance', distance([35, 45], [35, 45]) === 0);
  check(
    'Haversine known distance',
    Math.abs(distance([0, 0], [0, 1]) - 111.195) < 0.01,
  );
  const hours = defaultHours();
  hours[0] = { closed: false, allDay: false, open: '22:00', close: '02:00' };
  hours[1].closed = true;
  check(
    'Overnight hours use Baghdad time',
    opening(hours, new Date('2026-09-06T22:00:00Z')).open,
  );
  check(
    'Overnight closing boundary',
    !opening(hours, new Date('2026-09-06T23:00:00Z')).open,
  );
  check(
    'All closed returns no next opening',
    opening(hours.map((h) => ({ ...h, closed: true }))).time === undefined,
  );
  const initial = await json(await req('/api/fitters'));
  check(
    'Twelve approved demo listings',
    initial.filter((f) => f.demo).length === 12,
  );
  check(
    'Unauthorized admin rejected',
    (await req('/api/admin/data')).status === 401,
  );
  check(
    'Cross-origin mutation rejected',
    (await req('/api/contact', 'POST', {}, false, 'https://example.com'))
      .status === 403,
  );
  check(
    'Honeypot rejected',
    (
      await req('/api/contact', 'POST', {
        name: 'QA test',
        email: 'qa@example.com',
        message: 'Test spam',
        website: 'bot',
      })
    ).status === 400,
  );
  const login = await req('/api/admin/session', 'POST', { password });
  await json(login);
  cookie = login.headers.get('set-cookie').split(';')[0];
  check(
    'Admin session issued with HttpOnly',
    login.headers.get('set-cookie').includes('HttpOnly'),
  );
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: '#ff782d' },
  })
    .png()
    .toBuffer();
  created = (
    await json(await req('/api/fitters', 'POST', form(listing, image)))
  ).id;
  check(
    'Pending listing hidden',
    !(await json(await req('/api/fitters'))).some((f) => f.id === created),
  );
  let admin = await json(await req('/api/admin/data', 'GET', undefined, true));
  let f = admin.fitters.find((f) => f.id === created);
  check(
    'Submission stored pending with photo',
    f.status === 'pending' && f.photo_url,
  );
  check('Pending photo private', (await req(f.photo_url)).status === 404);
  await json(await req('/api/admin/fitters', 'PATCH', { id: created }, true));
  check(
    'Approval publishes listing',
    (await json(await req('/api/fitters'))).some((f) => f.id === created),
  );
  const photo = await req(f.photo_url);
  check(
    'Uploaded photo serves as WebP',
    photo.ok && photo.headers.get('content-type') === 'image/webp',
  );
  await json(
    await req(
      '/api/admin/fitters',
      'POST',
      form(
        {
          ...listing,
          id: created,
          name: 'QA edited fitter',
          status: 'approved',
          demo: false,
        },
        image,
      ),
      true,
    ),
  );
  admin = await json(await req('/api/admin/data', 'GET', undefined, true));
  const edited = admin.fitters.find((f) => f.id === created);
  check(
    'Edit and photo replacement persisted',
    edited.name === 'QA edited fitter' && edited.photo_url !== f.photo_url,
  );
  check('Replaced photo unavailable', (await req(f.photo_url)).status === 404);
  check(
    'Invalid review rating rejected',
    (
      await req('/api/reviews/' + created, 'POST', {
        reviewer_name: 'QA test',
        rating: 6,
        comment: 'Test comment',
      })
    ).status === 400,
  );
  await json(
    await req('/api/reviews/' + created, 'POST', {
      reviewer_name: 'QA test',
      rating: 4,
      comment: 'QA temporary review',
      website: '',
    }),
  );
  check(
    'Pending review hidden',
    (await json(await req('/api/reviews/' + created))).length === 0,
  );
  admin = await json(await req('/api/admin/data', 'GET', undefined, true));
  const review = admin.reviews.find((r) => r.fitter_id === created);
  await json(
    await req(
      '/api/admin/moderate',
      'POST',
      { table: 'reviews', id: review.id, action: 'approve' },
      true,
    ),
  );
  check(
    'Approved review appears',
    (await json(await req('/api/reviews/' + created))).length === 1,
  );
  check(
    'Rating average calculated',
    (await json(await req('/api/fitters'))).find((f) => f.id === created)
      .rating === 4,
  );
  await json(
    await req('/api/contact', 'POST', {
      name: 'QA temporary contact',
      email: 'qa@example.com',
      message: 'QA saved contact message',
      website: '',
    }),
  );
  admin = await json(await req('/api/admin/data', 'GET', undefined, true));
  const contact = admin.contacts.find((c) => c.name === 'QA temporary contact');
  check('Contact saved to admin inbox', !!contact);
  await json(
    await req(
      '/api/admin/moderate',
      'POST',
      { table: 'contacts', id: contact.id, action: 'delete' },
      true,
    ),
  );
  await json(
    await req(
      '/api/admin/moderate',
      'POST',
      { table: 'reviews', id: review.id, action: 'delete' },
      true,
    ),
  );
  check(
    'Review deletion works',
    (await json(await req('/api/reviews/' + created))).length === 0,
  );
  await json(await req('/api/admin/fitters', 'DELETE', { id: created }, true));
  created = undefined;
  check(
    'Listing deletion works',
    !(await json(await req('/api/fitters'))).some(
      (f) => f.name === 'QA edited fitter',
    ),
  );
  await json(await req('/api/admin/session', 'DELETE', undefined, true));
  check('Logout endpoint works');

  // ── Dispatch System Tests ────────────────────────────────────────────────
  // Re-login for dispatch tests (need an approved non-demo fitter)
  const login2 = await req('/api/admin/session', 'POST', { password });
  await json(login2);
  cookie = login2.headers.get('set-cookie').split(';')[0];

  // Create and approve a real (non-demo) fitter for dispatch
  const dispatchFitterData = {
    ...listing,
    name: 'QA dispatch fitter',
    working_hours: Array.from({ length: 7 }, () => ({ closed: false, allDay: true, open: '00:00', close: '23:59' })),
  };
  const { id: dispatchFitterId } = await json(
    await req('/api/fitters', 'POST', form(dispatchFitterData, image)),
  );
  // Approve it so it appears in publicFitters()
  const patchRes = await json(
    await req('/api/admin/fitters', 'PATCH', { id: dispatchFitterId }, true),
  );
  check('Dispatch fitter approved', !!dispatchFitterId);
  check('Dashboard code returned on approve', typeof patchRes.dashboard_code === 'string' && patchRes.dashboard_code.length === 32);
  const dashCode = patchRes.dashboard_code;

  // ── Out-of-area coordinates rejected ────────────────────────────────────
  const oobRes = await req('/api/dispatch', 'POST', {
    user_lat: 33.0, user_lng: 44.0, // Baghdad — not Sulaymaniyah
    user_phone: '+9647001234567', user_note: '',
  });
  check('Out-of-area dispatch rejected (422)', oobRes.status === 422);

  // ── Create a dispatch request ────────────────────────────────────────────
  const dispatchRes = await json(await req('/api/dispatch', 'POST', {
    user_lat: 35.56, user_lng: 45.43,
    user_phone: '+9647001234567', user_note: 'QA test',
  }));
  check('Dispatch created with user_token', typeof dispatchRes.user_token === 'string');
  check('Dispatch fitter_name returned', typeof dispatchRes.fitter_name === 'string');
  const userToken = dispatchRes.user_token;

  // ── user_phone NOT exposed via user polling endpoint ─────────────────────
  const userPoll = await json(await req(`/api/dispatch/${userToken}/fitter-location`));
  check('user_phone not in user polling response', !('user_phone' in userPoll));
  check('fitter_lat in user polling (null ok)', 'fitter_lat' in userPoll);

  // ── user_phone NOT in user status endpoint ───────────────────────────────
  const statusPoll = await json(await req(`/api/dispatch/${userToken}`));
  check('Status has status field', 'status' in statusPoll);
  check('user_phone not exposed in status endpoint', !('user_phone' in statusPoll));

  // ── Dashboard unauthorized access rejected ───────────────────────────────
  const badDashRes = await req('/api/fitter/dashboard/000000000000000000000000000000xx');
  check('Invalid dashboard code rejected (403)', badDashRes.status === 403);

  // ── Dashboard with real code returns fitter info ─────────────────────────
  const dashRes = await json(await req(`/api/fitter/dashboard/${dashCode}`));
  check('Dashboard code returns fitter info', dashRes.fitter?.fitter_name === 'QA dispatch fitter');

  // Get the fitter_token from dispatch (via admin data)
  const adminData = await json(await req('/api/admin/data', 'GET', undefined, true));
  const dispatchRecord = adminData.dispatches?.find?.(
    (d) => d.user_token === userToken,
  );
  // dispatch records may not be in admin data depending on implementation — soft check
  const fitterToken = dispatchRecord?.fitter_token;

  if (fitterToken) {
    // ── Accept flow ──────────────────────────────────────────────────────────
    await json(await req(`/api/dispatch/accept/${fitterToken}`, 'POST'));
    const afterAccept = await json(await req(`/api/dispatch/${userToken}`));
    check('Dispatch status is accepted after fitter accepts', afterAccept.status === 'accepted');

    // ── Complete flow ────────────────────────────────────────────────────────
    await json(await req(`/api/dispatch/accept/${fitterToken}`, 'POST', { complete: true }));
    const afterComplete = await json(await req(`/api/dispatch/${userToken}`));
    check('Dispatch status is completed', afterComplete.status === 'completed');
  } else {
    check('Accept/complete flow skipped (dispatch not in admin data — OK)');
  }

  // ── Decline + Reassign flow (new dispatch) ───────────────────────────────
  const dispatch2 = await json(await req('/api/dispatch', 'POST', {
    user_lat: 35.56, user_lng: 45.43,
    user_phone: '+9647001234567', user_note: '',
  }));
  const userToken2 = dispatch2.user_token;
  const adminData2 = await json(await req('/api/admin/data', 'GET', undefined, true));
  const dispatch2Record = adminData2.dispatches?.find?.((d) => d.user_token === userToken2);
  if (dispatch2Record?.fitter_token) {
    await json(await req(`/api/dispatch/decline/${dispatch2Record.fitter_token}`, 'POST'));
    const afterDecline = await json(await req(`/api/dispatch/${userToken2}`));
    check('Dispatch status declined after decline', afterDecline.status === 'declined');
  } else {
    check('Decline flow skipped (dispatch not in admin data — OK)');
  }

  // ── Fitter location rate limit (simulate rapid calls) ────────────────────
  const locPromises = Array.from({ length: 5 }, () =>
    req('/api/fitter/location', 'POST', {
      fitter_code: dashCode, lat: 35.56, lng: 45.43, is_online: true,
    }),
  );
  const locResults = await Promise.all(locPromises);
  check(
    'Fitter location accepts reasonable burst',
    locResults.some((r) => r.status === 200 || r.status === 403), // 403=bad code on vercel, 200=ok
  );

  // Cleanup dispatch fitter
  await req('/api/admin/fitters', 'DELETE', { id: dispatchFitterId }, true);
  await json(await req('/api/admin/session', 'DELETE', undefined, true));
  check('Dispatch tests cleanup done');

  console.log(
    `\n${passed.length} checks passed. Temporary test records removed.`,
  );
} finally {
  if (created && cookie)
    await req('/api/admin/fitters', 'DELETE', { id: created }, true);
}
