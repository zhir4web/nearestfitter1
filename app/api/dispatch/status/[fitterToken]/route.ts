import { failure } from '@/lib/security';
import { getDispatchByFitterToken } from '@/lib/repository';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fitterToken: string }> },
) {
  try {
    const { fitterToken } = await params;
    const dispatch = await getDispatchByFitterToken(fitterToken);
    if (!dispatch) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json({
      status: dispatch.status,
      user_lat: dispatch.user_lat,
      user_lng: dispatch.user_lng,
      created_at: dispatch.created_at,
      fitter_name: dispatch.fitter_name,
    });
  } catch (e) {
    return failure(e);
  }
}
