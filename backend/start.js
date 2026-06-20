import 'dotenv/config';
import { runMigrations } from './src/migrations/run.js';

console.log('[start] Running migrations…');
runMigrations()
  .then(() => import('./src/index.js'))
  .catch((err) => {
    console.error('[start] Startup failed:', err.message);
    process.exit(1);
  });
