import { readPhoto } from '@/lib/photos';
import { rows } from '@/lib/repository';
import { isAdmin, failure, HttpError } from '@/lib/security';
import type { Fitter } from '@/types';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    const f = (await rows<Fitter>('fitters')).find(
      (f) => f.photo_url === '/api/photos/' + key,
    );
    if (!f || (f.status !== 'approved' && !(await isAdmin())))
      throw new HttpError(404, 'Not found');
    const data = await readPhoto(key);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
