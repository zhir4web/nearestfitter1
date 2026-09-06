import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
// Interactive setup keeps plaintext credentials out of source and environment files.
if (existsSync('.env')) {
  console.log(
    '.env already exists. Use npm run password to create a replacement hash.',
  );
  process.exit(0);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question(
  'Choose an admin password (at least 12 characters): ',
);
rl.close();
if (password.length < 12) throw Error('Use at least 12 characters');
const salt = randomBytes(16).toString('hex');
let env = readFileSync('.env.example', 'utf8')
  .replace(
    'ADMIN_PASSWORD_HASH=',
    'ADMIN_PASSWORD_HASH=' +
      salt +
      ':' +
      scryptSync(password, salt, 64).toString('hex'),
  )
  .replace(
    'SESSION_SECRET=',
    'SESSION_SECRET=' + randomBytes(48).toString('hex'),
  );
writeFileSync('.env', env);
console.log('Local configuration saved. Run npm run db:setup.');
