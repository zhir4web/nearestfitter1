import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const dash = await prisma.fitterDashboard.findFirst({ include: { fitter: true } });
  if (dash) {
    console.log("Code:", dash.code, "Fitter:", dash.fitter.name);
  } else {
    console.log("No dashboards found. Let's create one.");
    const firstFitter = await prisma.fitter.findFirst();
    if (firstFitter) {
      const code = 'F' + Math.floor(1000 + Math.random() * 9000);
      await prisma.fitterDashboard.create({
        data: {
          id: 'dash-' + Date.now(),
          fitter_id: firstFitter.id,
          code: code,
          created_at: new Date().toISOString()
        }
      });
      console.log("Created code:", code, "for", firstFitter.name);
    }
  }
}
main().finally(() => prisma.$disconnect());
