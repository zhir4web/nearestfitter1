import { failure } from '@/lib/security';
import { getDispatchByFitterToken, updateDispatchStatus } from '@/lib/repository';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ fitterToken: string }> },
) {
  try {
    const { fitterToken } = await params;
    const dispatch = await getDispatchByFitterToken(fitterToken);
    if (!dispatch) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (dispatch.status !== 'pending') {
      return Response.json({ error: 'Already handled' }, { status: 409 });
    }
    await updateDispatchStatus(dispatch.id, 'declined');
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
