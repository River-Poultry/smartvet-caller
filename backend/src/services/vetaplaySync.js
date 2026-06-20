import Database from 'better-sqlite3';
import { query } from '../config/db.js';
import { logger } from '../config/logger.js';

const SQLITE_PATH = '/Users/RICHOBUKU/smartvet-app/backend/db.sqlite3';

export async function syncFromVetaplay() {
  let db;
  try {
    db = new Database(SQLITE_PATH, { readonly: true });
  } catch (err) {
    logger.warn('Vetaplay SQLite not accessible, skipping sync', { error: err.message });
    return { synced: 0 };
  }

  // Sync vets
  const vpVets = db.prepare('SELECT * FROM dashboard_vet').all();
  for (const v of vpVets) {
    await query(`
      INSERT INTO vets (name, phone, email, role, district, location_lat, location_lng, specialisation, is_available)
      VALUES ($1,$2,$3,'paravet',$4,$5,$6,$7,true)
      ON CONFLICT (phone) DO UPDATE SET name=EXCLUDED.name, specialisation=EXCLUDED.specialisation
    `, [v.name, v.phone, v.email || null, v.location || null, v.latitude || null, v.longitude || null, v.specialization || 'Poultry']);
  }

  // Sync farmers
  const vpFarmers = db.prepare('SELECT * FROM dashboard_farmer').all();
  for (const f of vpFarmers) {
    await query(`
      INSERT INTO farmers (name, phone, district, location_lat, location_lng)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (phone) DO UPDATE SET name=EXCLUDED.name
    `, [f.name, f.whatsapp || f.email, f.location || null, f.latitude || null, f.longitude || null]);
  }

  // Sync batches and tasks
  const vpBatches = db.prepare(`
    SELECT b.*, f.whatsapp as farmer_phone, v.phone as vet_phone
    FROM dashboard_batch b
    LEFT JOIN dashboard_farmer f ON f.id = b.farmer_id
    LEFT JOIN dashboard_vet v ON v.id = b.assigned_vet_id
  `).all();

  let synced = 0;
  for (const b of vpBatches) {
    const farmerRes = await query('SELECT id FROM farmers WHERE phone = $1', [b.farmer_phone]);
    if (!farmerRes.rows.length) continue;
    const farmerId = farmerRes.rows[0].id;

    let vetId = null;
    if (b.vet_phone) {
      const vetRes = await query('SELECT id FROM vets WHERE phone = $1', [b.vet_phone]);
      vetId = vetRes.rows[0]?.id || null;
    }

    const batchRes = await query(`
      INSERT INTO batches (farmer_id, arrival_date, description, assigned_vet_id, vetaplay_batch_id)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT DO NOTHING RETURNING id
    `, [farmerId, b.arrival_date, b.description || null, vetId, b.id]);

    if (!batchRes.rows.length) continue;
    const batchId = batchRes.rows[0].id;

    // Sync tasks for this batch
    const vpTasks = db.prepare('SELECT * FROM dashboard_task WHERE batch_id = ?').all(b.id);
    for (const t of vpTasks) {
      await query(`
        INSERT INTO batch_tasks (batch_id, description, status, scheduled_at, vetaplay_task_id)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT DO NOTHING
      `, [batchId, t.description, t.status || 'pending', t.scheduled_at || null, t.id]);
    }
    synced++;
  }

  db.close();
  logger.info('Vetaplay sync complete', { synced });
  return { synced };
}
