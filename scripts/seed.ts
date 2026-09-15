import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

import { mockFitters } from '../lib/mock-data.ts';

async function runSeed() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const s = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    for (const item of mockFitters) {
      const { reviews, ...fitterData } = item;
      await s.from('fitters').upsert(fitterData as any, { onConflict: 'id' });
      if (reviews?.length) {
        await s.from('reviews').upsert(
          reviews.map((r) => ({ ...r, fitter_id: item.id })),
          { onConflict: 'id' },
        );
      }
    }
  } else {
    const p = new PrismaClient();
    // Clear existing demo fitters first
    await p.fitter.deleteMany({ where: { demo: true } });

    for (const item of mockFitters) {
      const { reviews, ...fitterData } = item;
      await p.fitter.create({
        data: fitterData,
      });
      if (reviews?.length) {
        for (const r of reviews) {
          await p.review.create({
            data: {
              ...r,
              fitter_id: item.id,
            },
          });
        }
      }
    }
    await p.$disconnect();
  }

  console.log(`Successfully seeded ${mockFitters.length} realistic fitters with reviews across Sulaymaniyah!`);
}

runSeed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
