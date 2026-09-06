import { cookies } from 'next/headers';
import {
  sameOrigin,
  rate,
  jsonBody,
  failure,
  HttpError,
  verifyPassword,
  sessionToken,
  isAdmin,
} from '@/lib/security';
export async function GET() {
  return Response.json({ authenticated: await isAdmin() });
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'login', 8, 15 * 60000);
    const body = await jsonBody(req);
    if (
      typeof body.password !== 'string' ||
      body.password.length > 256 ||
      !verifyPassword(body.password)
    )
      throw new HttpError(401, 'Incorrect password');
    (await cookies()).set('nf_session', sessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 3600,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    (await cookies()).delete('nf_session');
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
