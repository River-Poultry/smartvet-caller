import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { MIGRATION_FILES } from '../config/migrations.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] DATABASE_URL is not set');
    process.exit(1);
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
        console.log(`[skip] ${file} already applied`);
        continue;
      }

      const sql = readFileSync(join(__dirname, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[ok]   ${file}`);
    }

    console.log('Migrations complete.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
