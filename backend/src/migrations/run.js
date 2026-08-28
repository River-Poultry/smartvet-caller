import 'dotenv/config';
import { runMigrations } from '../db/migrate.js';

runMigrations()
  .then(() => {
    console.log('[migrations] Migrations completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[migrations] Migration error:', err.message);
    process.exit(1);
  });
