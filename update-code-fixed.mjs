import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
const prisma = new PrismaClient();
async function main() {
  const code = randomBytes(16).toString('hex');
  const hashed = createHash('sha256').update(code).digest('hex');
  await prisma.fitterDashboard.updateMany({ data: { code: hashed }});
  console.log("Use this code:", code);
}
main().finally(() => prisma.$disconnect());
