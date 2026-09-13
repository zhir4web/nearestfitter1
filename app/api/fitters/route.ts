import { randomUUID } from 'node:crypto';
import { publicFitters, insert, getActiveFitterIds } from '@/lib/repository';
import { sameOrigin, rate, failure, formBody, HttpError } from '@/lib/security';
import { fitterSchema } from '@/lib/validation';
import { savePhoto, removePhoto } from '@/lib/photos';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const [fitters, busyIds] = await Promise.all([
      publicFitters(),
      getActiveFitterIds(),
    ]);
    return Response.json(
      fitters.map((f) => ({ ...f, is_busy: busyIds.has(f.id) })),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  let photo = '';
  try {
    sameOrigin(req);
    await rate(req, 'submission', 5);
    if (Number(req.headers.get('content-length') || 0) > 4500000)
      throw new HttpError(413, 'Too large');
    const form = await formBody(req);
    const parsed = fitterSchema.safeParse(JSON.parse(String(form.get('data'))));
    if (!parsed.success) {
      console.error('Validation error in public fitters:', JSON.stringify(parsed.error.issues, null, 2));
      const issueMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new HttpError(400, `هەڵەی زانیاری: ${issueMsg}`);
    }
    const { website, ...data } = parsed.data;
    const file = form.get('photo');
    if (file instanceof File && file.size) photo = await savePhoto(file);
    const id = randomUUID();
    await insert('fitters', {
      ...data,
      id,
      photo_url: photo,
      status: 'pending',
      demo: false,
      created_at: new Date().toISOString(),
    });
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    if (photo) await removePhoto(photo);
    return failure(e);
  }
}
