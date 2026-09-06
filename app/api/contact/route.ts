import { randomUUID } from 'node:crypto';
import { insert } from '@/lib/repository';
import { sameOrigin, rate, jsonBody, failure, HttpError } from '@/lib/security';
import { contactSchema } from '@/lib/validation';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rate(req, 'contact', 5);
    const parsed = contactSchema.safeParse(await jsonBody(req));
    if (!parsed.success) throw new HttpError(400, 'Invalid message');
    const { website, ...data } = parsed.data;
    await insert('contacts', {
      ...data,
      id: randomUUID(),
      created_at: new Date().toISOString(),
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
