import { failure, sameOrigin, jsonBody, rate, HttpError, privateJson } from '@/lib/security';
import { getDispatchByUserToken, transitionDispatch } from '@/lib/repository';
export async function GET(_req: Request, { params }: { params: Promise<{ userToken: string }> }) {
  try {
    const { userToken } = await params;
    if (!/^[a-f0-9]{48}$/.test(userToken)) throw new HttpError(404, 'Not found');
    const dispatch = await getDispatchByUserToken(userToken);
    if (!dispatch) throw new HttpError(404, 'Not found');
    const { id, created_at, ...result } = dispatch;
    return privateJson(result);
  } catch (e) { return failure(e); }
}
export async function POST(req: Request, { params }: { params: Promise<{ userToken: string }> }) {
  try {
    sameOrigin(req);
    await rate(req, 'dispatch-cancel', 30, 3600000);
    const { userToken } = await params;
    if ((await jsonBody(req)).action !== 'cancel') throw new HttpError(400, 'Unknown action');
    const changed = await transitionDispatch(userToken, 'user', ['pending', 'accepted', 'en_route', 'declined', 'expired'], 'cancelled', { commission_status: 'void' });
    if (!changed) throw new HttpError(409, 'This request has already changed');
    return privateJson({ ok: true });
  } catch (e) { return failure(e); }
}
