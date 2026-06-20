import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { runMigrations } from './src/migrations/run.js';
import { query } from './src/config/db.js';

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin';
  if (!email || !password) return;

  const { rows } = await query('SELECT id FROM agents WHERE is_admin = true LIMIT 1');
  if (rows.length) return; // admin already exists

  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO agents (name, email, password_hash, is_admin, is_verified, status)
     VALUES ($1, $2, $3, true, true, 'offline')
     ON CONFLICT (email) DO NOTHING`,
    [name, email, hash]
  );
  console.log(`[start] Admin account created for ${email}`);
}

console.log('[start] Running migrations…');
runMigrations()
  .then(seedAdmin)
  .then(() => import('./src/index.js'))
  .catch((err) => {
    console.error('[start] Startup failed:', err.message);
    process.exit(1);
  });
