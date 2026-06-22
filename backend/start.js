import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { runMigrations } from './src/db/migrate.js';
import { query } from './src/db/index.js';

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin';
  if (!email || !password) return;

  // Check if THIS specific email already exists
  const existing = await query('SELECT id, password_hash FROM agents WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    // If the stored hash is our placeholder, overwrite it with the real password
    const isPlaceholder = existing.rows[0].password_hash?.includes('placeholder');
    if (!isPlaceholder) {
      console.log(`[start] Admin ${email} already exists — skipping seed`);
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE agents SET password_hash = $1, is_admin = true, is_verified = true WHERE email = $2`,
      [hash, email.toLowerCase()]
    );
    console.log(`[start] Updated placeholder hash for ${email}`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO agents (name, email, password_hash, is_admin, is_verified, status)
     VALUES ($1, $2, $3, true, true, 'offline')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_admin = true, is_verified = true`,
    [name, email.toLowerCase(), hash]
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
