import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

if (!/qa(?:-admin)?\.db$/.test(process.env.DATABASE_URL || '')) throw new Error('Use an isolated qa.db or qa-admin.db for this test.');
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const id = `qa-${randomBytes(6).toString('hex')}`, code = randomBytes(24).toString('hex');
let cookie = '', postId;
const hash = value => createHash('sha256').update(value).digest('hex');
async function request(path, body, method = body ? 'POST' : 'GET', admin = false) {
  return fetch(base + '/api' + path, {method, headers: {'Content-Type':'application/json', Origin:base, 'x-forwarded-for':id, ...(admin ? {Cookie:cookie} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
}
async function json(response) { assert.ok(response.ok, `${response.status}: ${await response.clone().text()}`); return response.json(); }
function pass(label) { console.log('PASS', label); }
try {
  const auth=await request('/admin/session',{password:process.env.TEST_ADMIN_PASSWORD});await json(auth);cookie=auth.headers.get('set-cookie').split(';')[0];
  const acceptanceFee=(await json(await request('/admin/settings',undefined,'GET',true))).commission_fixed_iqd;
  await db.fitter.create({data:{id,name:'QA fitter',type:'mobile',phone:'+9647700000000',latitude:35.56,longitude:45.43,neighborhood:'QA',services:['puncture'],working_hours:Array.from({length:7},()=>({closed:false,allDay:true,open:'00:00',close:'23:59'})),status:'approved',demo:false,created_at:new Date().toISOString()}});
  await db.fitterDashboard.create({data:{id:id+'-dash',fitter_id:id,code:hash(code),created_at:new Date().toISOString()}});
  await json(await request('/fitter/location',{fitter_code:code,is_online:true,lat:35.56,lng:45.43}));
  const publicFitter = (await json(await request('/fitters'))).find(f=>f.id===id);
  assert.ok(publicFitter.is_online);
  for(const field of ['phone','phone2','whatsapp','code']) assert.ok(!(field in publicFitter));
  pass('Public fitter data excludes private contact and credentials');
  assert.equal((await request('/fitter/dashboard/'+ '0'.repeat(48))).status,403);
  assert.equal((await request('/admin/data')).status,401);
  pass('Private portals reject unauthorized access');
  const input={user_lat:35.561,user_lng:45.431,user_phone:'+9647700000001',user_note:'QA puncture',fitter_id:id};
  const booking=await json(await request('/dispatch',input));
  assert.equal((await request('/dispatch',input)).status,404);
  pass('An active request reserves its fitter');
  const dashboard=await json(await request('/fitter/dashboard/'+code));
  const token=dashboard.request.fitter_token;
  assert.equal((await request('/dispatch/accept/'+token,{action:'accept'})).status,403);
  await json(await request('/dispatch/accept/'+token,{fitter_code:code,action:'accept'}));
  assert.equal((await request('/dispatch/accept/'+token,{fitter_code:code,action:'accept'})).status,409);
  await json(await request('/dispatch/accept/'+token,{fitter_code:code,action:'en_route'}));
  await json(await request('/dispatch/accept/'+token,{fitter_code:code,action:'complete',final_price_iqd:20000}));
  const result=await json(await request('/dispatch/'+booking.user_token));
  assert.equal(result.status,'completed');
  assert.equal(result.commission_iqd,acceptanceFee);
  assert.ok(!('fitter_token' in result));
  pass('Accept, en route, complete and commission are persisted; repeated accept rejected');
  const another=await json(await request('/dispatch',input));
  await json(await request('/dispatch/'+another.user_token,{action:'cancel'}));
  assert.equal((await json(await request('/dispatch/'+another.user_token))).status,'cancelled');
  pass('Completed fitter can receive another request; customer cancellation works');
  const post=await json(await request('/community',{author_name:'QA driver',title:'Tire pressure problem',car_model:'Toyota',neighborhood:'Sulaymaniyah',body:'My tire loses pressure every morning.'})); postId=post.id;
  assert.equal((await request('/community/'+post.id,{owner_token:'0'.repeat(48),status:'resolved'},'PATCH')).status,404);
  await json(await request('/community/'+post.id+'/replies',{fitter_code:code,body:'Please visit for a tire inspection.'}));
  const visible=(await json(await request('/community'))).find(p=>p.id===post.id);
  assert.equal(visible.replies.length,1); assert.ok(!('owner_hash' in visible));
  await json(await request('/community/'+post.id,{owner_token:post.owner_token,status:'resolved'},'PATCH'));
  pass('Community posts, verified fitter replies and owner authorization work');
  const login=await request('/admin/session',{password:process.env.TEST_ADMIN_PASSWORD}); await json(login); cookie=login.headers.get('set-cookie').split(';')[0];
  await json(await request('/reviews/'+id,{reviewer_name:'QA driver',rating:5,comment:'Helpful service'}));
  assert.equal((await json(await request('/reviews/'+id))).length,0);
  const review=await db.review.findFirst({where:{fitter_id:id}});
  await json(await request('/admin/moderate',{table:'reviews',id:review.id,action:'approve'},'POST',true));
  assert.equal((await json(await request('/reviews/'+id))).length,1);
  pass('Ratings require admin moderation');
} finally {
  if(postId) await db.communityPost.deleteMany({where:{id:postId}});
  await db.accountCharge.deleteMany({where:{fitter_id:id}});
  await db.accountSettlement.deleteMany({where:{fitter_id:id}});
  await db.fitter.deleteMany({where:{id}});
  await db.$disconnect();
}
