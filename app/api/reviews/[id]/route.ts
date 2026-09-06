import { randomUUID } from 'node:crypto';
import { rows, insert } from '@/lib/repository';
import type { Fitter, Review } from '@/types';
import { sameOrigin, rate, jsonBody, failure, HttpError } from '@/lib/security';
import { reviewSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
async function fitter(id: string) {
  if (
    !(await rows<Fitter>('fitters')).some(
      (f) => f.id === id && f.status === 'approved',
    )
  )
    throw new HttpError(404, 'Not found');
}
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await fitter(id);
    return Response.json(
      (await rows<Review>('reviews')).filter(
        (r) => r.fitter_id === id && r.status === 'approved',
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, ctx: Ctx) {
  try {
    sameOrigin(req);
    await rate(req, 'review', 5);
    const { id } = await ctx.params;
    await fitter(id);
    const parsed = reviewSchema.safeParse(await jsonBody(req));
    if (!parsed.success) throw new HttpError(400, 'Invalid review');
    const { website, ...data } = parsed.data;
    await insert('reviews', {
      ...data,
      id: randomUUID(),
      fitter_id: id,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
