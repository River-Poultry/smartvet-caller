import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_farmers_vets.sql',
  '003_batches_tasks.sql',
  '004_enrich_schema.sql',
  '005_escalation_inventory.sql',
  '006_warehouse_inventory.sql',
  '007_auth_security.sql',
  '008_django_link.sql',
  '009_agent_roles.sql',
  '010_fix_phone_column.sql',
  '011_calls_next_steps.sql',
  '012_agent_active_flag.sql',
  '013_vet_board.sql',
  '014_restore_admin.sql',
];

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] DATABASE_URL is not set — skipping migrations');
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        ran_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const file of MIGRATION_FILES) {
      const { rows } = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`[skip] ${file}`);
        continue;
      }

      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[ok]   ${file}`);
    }

    console.log('[migrate] Done.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[migrate] Failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  import('dotenv/config').then(() => runMigrations()).catch(() => process.exit(1));
}
