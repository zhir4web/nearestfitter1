import { cookies } from 'next/headers';
import {
  createHmac,
  scryptSync,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { hitLimit } from './repository';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new HttpError(503, 'Admin setup required');
  return s;
}
export function verifyPassword(password: string) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) throw new HttpError(503, 'Admin setup required');
  const [salt, hex] = hash.split(':');
  if (!salt || !hex || !/^[0-9a-f]{128}$/.test(hex))
    throw new HttpError(503, 'Invalid admin configuration');
  const expected = Buffer.from(hex, 'hex');
  return timingSafeEqual(expected, scryptSync(password, salt, 64));
}
export function sessionToken() {
  const body = Buffer.from(
    JSON.stringify({ expires: Date.now() + 8 * 3600000 }),
  ).toString('base64url');
  return (
    body + '.' + createHmac('sha256', secret()).update(body).digest('base64url')
  );
}
export async function isAdmin() {
  const value = (await cookies()).get('nf_session')?.value;
  if (!value) return false;
  try {
    const [body, sig] = value.split('.');
    const valid = createHmac('sha256', secret())
      .update(body)
      .digest('base64url');
    return (
      sig?.length === valid.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(valid)) &&
      JSON.parse(Buffer.from(body, 'base64url').toString()).expires > Date.now()
    );
  } catch {
    return false;
  }
}
export async function requireAdmin() {
  if (!(await isAdmin())) throw new HttpError(401, 'Unauthorized');
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || new URL(origin).host !== req.headers.get('host'))
    throw new HttpError(403, 'Origin rejected');
}
export async function rate(
  req: Request,
  action: string,
  max = 10,
  windowMs = 3600000,
) {
  const ip = process.env.VERCEL
    ? req.headers.get('x-vercel-forwarded-for') || 'unknown'
    : req.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  const key = createHash('sha256')
    .update(action + ':' + ip)
    .digest('hex');
  if (await hitLimit(key, max, windowMs))
    throw new HttpError(429, 'Too many requests. Please try again later.');
}
async function boundedBody(req: Request, max: number) {
  if (Number(req.headers.get('content-length') || 0) > max)
    throw new HttpError(413, 'Request too large');
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new HttpError(413, 'Request too large');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}
export async function jsonBody(req: Request) {
  const body = await boundedBody(req, 25000);
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new HttpError(400, 'Invalid request');
  }
}
export async function formBody(req: Request) {
  const body = await boundedBody(req, 4500000);
  try {
    return await new Response(body, {
      headers: { 'Content-Type': req.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new HttpError(400, 'Invalid form');
  }
}
export function failure(e: unknown) {
  if (e instanceof HttpError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error('Request failed', e instanceof Error ? e.message : 'unknown');
  return Response.json(
    { error: 'Unable to complete request' },
    { status: 500 },
  );
}
