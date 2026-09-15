import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createCommunityPost, listCommunityPosts } from '@/lib/community';
import { failure, HttpError, jsonBody, privateJson, rate, sameOrigin } from '@/lib/security';

const schema = z.object({
  author_name: z.string().trim().min(2).max(70),
  title: z.string().trim().min(4).max(120),
  car_model: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().min(2).max(100),
  body: z.string().trim().min(10).max(1800),
  website: z.string().max(0).optional(),
  owner_token: z.string().regex(/^[a-f0-9]{48}$/).optional(),
});

export async function GET() {
  try { return Response.json(await listCommunityPosts()); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request); await rate(request, 'community-post', 5);
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, 'Please complete all fields.');
    if (parsed.data.website) throw new HttpError(400, 'Invalid request');
    const ownerToken = parsed.data.owner_token || randomBytes(24).toString('hex');
    const { website: _website, owner_token: _owner, ...input } = parsed.data;
    const id = await createCommunityPost(input, ownerToken);
    return privateJson({ id, owner_token: ownerToken }, 201);
  } catch (error) { return failure(error); }
}
