import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
const prisma = new PrismaClient();
async function main() {
  const code = randomBytes(16).toString('hex');
  await prisma.fitterDashboard.updateMany({ data: { code: code }});
  console.log(code);
}
main().finally(() => prisma.$disconnect());
