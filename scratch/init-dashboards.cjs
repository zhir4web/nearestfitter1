const { PrismaClient } = require('../node_modules/@prisma/client');
const crypto = require('node:crypto');
const p = new PrismaClient();

async function init() {
  const fitters = await p.fitter.findMany({ where: { status: 'approved' } });
  for (const f of fitters) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 char code
    try {
      await p.fitterDashboard.create({
        data: {
          id: code,
          fitter_id: f.id,
          code,
          created_at: new Date().toISOString()
        }
      });
      console.log(`Created dashboard code ${code} for fitter ${f.name}`);
    } catch (e) {
      console.log(`Skipped ${f.name} (might already have a dashboard)`);
    }
  }
  await p.$disconnect();
}
init();
