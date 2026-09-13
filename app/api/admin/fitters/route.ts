import { randomBytes, randomUUID } from 'node:crypto';
import { insert, update, rows, remove, createFitterDashboard } from '@/lib/repository';
import {
  sameOrigin,
  requireAdmin,
  failure,
  formBody,
  HttpError,
  jsonBody,
} from '@/lib/security';
import { fitterSchema } from '@/lib/validation';
import { savePhoto, removePhoto } from '@/lib/photos';
import type { Fitter } from '@/types';

/** Generate a strong 32-char hex dashboard code (16 random bytes) */
function newDashboardCode() {
  return randomBytes(16).toString('hex');
}

export async function POST(req: Request) {
  let photo = '';
  try {
    sameOrigin(req);
    await requireAdmin();
    if (Number(req.headers.get('content-length') || 0) > 4500000)
      throw new HttpError(413, 'Too large');
    const form = await formBody(req);
    const raw = JSON.parse(String(form.get('data')));
    const parsed = fitterSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('Validation error in admin fitters:', JSON.stringify(parsed.error.issues, null, 2));
      const issueMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new HttpError(400, `هەڵەی زانیاری: ${issueMsg}`);
    }
    const { website, ...data } = parsed.data;
    const id = typeof raw.id === 'string' ? raw.id : randomUUID();
    const existing = (await rows<Fitter>('fitters')).find((f) => f.id === id);
    if (raw.id && !existing) throw new HttpError(404, 'Not found');
    const file = form.get('photo');
    if (file instanceof File && file.size) photo = await savePhoto(file);
    const record = {
      ...data,
      id,
      status:
        raw.status === 'pending' ? ('pending' as const) : ('approved' as const),
      demo: raw.demo === true,
      photo_url: photo || (raw.removePhoto ? '' : existing?.photo_url || ''),
      created_at: existing?.created_at || new Date().toISOString(),
    };
    if (existing) await update('fitters', id, record);
    else {
      await insert('fitters', record);
      // Auto-create dashboard for new fitters (approved or pending)
      const code = newDashboardCode();
      try { await createFitterDashboard(id, code); } catch { /* non-fatal */ }
    }
    if (existing?.photo_url && existing.photo_url !== record.photo_url)
      await removePhoto(existing.photo_url);
    return Response.json({ id });
  } catch (e) {
    if (photo) await removePhoto(photo);
    return failure(e);
  }
}

export async function PATCH(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const { id } = await jsonBody(req);
    if (typeof id !== 'string') throw new HttpError(400, 'Invalid ID');
    await update('fitters', id, { status: 'approved' });
    // Ensure a dashboard exists — create one if missing
    const code = newDashboardCode();
    try { await createFitterDashboard(id, code); } catch { /* dashboard may already exist */ }
    return Response.json({ ok: true, dashboard_code: code });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const { id } = await jsonBody(req);
    const f = (await rows<Fitter>('fitters')).find((f) => f.id === id);
    if (!f) throw new HttpError(404, 'Not found');
    await remove('fitters', id);
    if (f.photo_url) await removePhoto(f.photo_url);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
