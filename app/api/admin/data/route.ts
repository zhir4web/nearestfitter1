import { rows } from '@/lib/repository';
import { requireAdmin, failure } from '@/lib/security';

export async function GET() {
  try {
    await requireAdmin();
    const fitters = await rows('fitters');
    const reviews = await rows('reviews');
    const contacts = await rows('contacts');
    
    return Response.json({
      fitters: fitters || [],
      reviews: reviews || [],
      contacts: contacts || []
    });
  } catch (e) {
    return failure(e);
  }
}
