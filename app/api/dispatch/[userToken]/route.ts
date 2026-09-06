import { failure } from '@/lib/security';
import { getDispatchByUserToken } from '@/lib/repository';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userToken: string }> },
) {
  try {
    const { userToken } = await params;
    const dispatch = await getDispatchByUserToken(userToken);
    if (!dispatch) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json({
      status: dispatch.status,
      fitter_name: dispatch.fitter_name,
      fitter_phone: dispatch.fitter_phone,
      fitter_whatsapp: dispatch.fitter_whatsapp,
      accepted_at: dispatch.accepted_at,
    });
  } catch (e) {
    return failure(e);
  }
}
