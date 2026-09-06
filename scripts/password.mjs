import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question(
  'New admin password (at least 12 characters): ',
);
rl.close();
if (password.length < 12) throw Error('Use at least 12 characters');
const salt = randomBytes(16).toString('hex');
console.log(
  'ADMIN_PASSWORD_HASH=' +
    salt +
    ':' +
    scryptSync(password, salt, 64).toString('hex'),
);
