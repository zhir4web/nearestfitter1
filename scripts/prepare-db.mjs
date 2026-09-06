import { existsSync, mkdirSync, closeSync, openSync } from 'node:fs';
import path from 'node:path';
// Prisma 6 on Windows needs an existing SQLite file on some restricted systems.
const url = process.env.DATABASE_URL || 'file:./dev.db';
if (url.startsWith('file:')) {
  const file = path.resolve('prisma', url.slice(5));
  mkdirSync(path.dirname(file), { recursive: true });
  if (!existsSync(file)) closeSync(openSync(file, 'a'));
}
