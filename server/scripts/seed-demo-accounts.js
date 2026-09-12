import '../src/config.js';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { User, roles } from '../src/models/User.js';
import { hashPassword } from '../src/auth.js';

// These are clearly labelled demonstration identities, never a public role switch.
const directory = new URL('../generated/', import.meta.url);
const file = new URL('demo-accounts.json', directory);
try {
  if (!process.env.MONGODB_URI) throw new Error('Missing configuration.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await User.init();
  await mkdir(directory, { recursive: true });
  let accounts = [];
  try { accounts = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const role of roles) {
    const username = `demo-${role}`;
    if (await User.exists({ username })) continue; // Never reset an existing account.
    const password = randomBytes(18).toString('base64url');
    await User.create({ username, role, demo: true, passwordHash: await hashPassword(password) });
    accounts.push({ username, role, password });
    await writeFile(file, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
  }
  console.log('Demo accounts are ready. Read server/generated/demo-accounts.json locally. Credentials are not printed; existing accounts were preserved.');
} catch { console.error('Demo account setup failed. Check MongoDB and the local credential file; details suppressed.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
