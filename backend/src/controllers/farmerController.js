/**
 * Farmer controller — serves live data from the Django SmartVet backend.
 * Falls back to local call-centre DB for call history, batches recorded here.
 */
import { query } from '../config/db.js';
import { listFarmers as djangoList, getFarmerByPhone as djangoGetByPhone,
         getFarmerBatches, createFarmerInDjango } from '../services/smartvetCore.js';
import { logger } from '../config/logger.js';

export async function listFarmers(req, res) {
  const { search = '', page = 1, limit = 30 } = req.query;

  try {
    const { count, farmers } = await djangoList({ search, page });

    // Enrich each farmer with call history count from local DB
    const phones = farmers.map(f => f.phone).filter(Boolean);
    let callCounts = {};
    if (phones.length) {
      const { rows } = await query(
        `SELECT phone_number, count(*) as total_calls
         FROM calls WHERE phone_number = ANY($1) GROUP BY phone_number`,
        [phones]
      );
      rows.forEach(r => { callCounts[r.phone_number] = parseInt(r.total_calls); });
    }

    const enriched = farmers.map(f => ({
      ...f,
      total_calls: callCounts[f.phone] || 0,
    }));

    res.json({ farmers: enriched, total: count, page: parseInt(page) });
  } catch (err) {
    logger.error('listFarmers error', { error: err.message });
    res.status(502).json({ error: 'Could not reach SmartVet backend', detail: err.message });
  }
}

export async function getFarmer(req, res) {
  const { farmerId } = req.params;
  // farmerId is "django-{id}" from the bridge, or a raw Django id
  const djangoId = farmerId.replace('django-', '');

  try {
    // Pull farmer profile
    const { farmers } = await djangoList({ search: '' });
    const farmer = farmers.find(f => String(f.django_id) === djangoId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    // Pull batches from Django
    const batches = await getFarmerBatches(djangoId);

    // Pull call history from local call centre DB
    const callsRes = await query(
      `SELECT id, started_at, duration_seconds, call_intent, is_emergency, outcome, agent_notes
       FROM calls WHERE phone_number = $1 ORDER BY started_at DESC LIMIT 10`,
      [farmer.phone]
    );

    res.json({
      farmer,
      farms: farmer.farm_name ? [{ name: farmer.farm_name, address: farmer.address }] : [],
      call_history: callsRes.rows,
      batches: Array.isArray(batches) ? batches : [],
    });
  } catch (err) {
    logger.error('getFarmer error', { farmerId, error: err.message });
    res.status(502).json({ error: 'Could not reach SmartVet backend' });
  }
}

export async function getFarmerByPhone(req, res) {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  try {
    const farmer = await djangoGetByPhone(phone);
    res.json(farmer || null);
  } catch (err) {
    res.json(null);
  }
}

export async function createFarmer(req, res) {
  const { name, full_name, phone, email, farm_name, address, district,
          chicken_type, preferred_language, latitude, longitude, notes } = req.body;

  if (!name && !full_name) return res.status(400).json({ error: 'name required' });
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const farmerName = full_name || name;

  try {
    // 1. Check if already exists in Django
    const existing = await djangoGetByPhone(phone);
    if (existing) {
      return res.status(200).json({ farmer: existing, already_exists: true });
    }

    // 2. Create in Django (registers on main app + mobile app immediately)
    const result = await createFarmerInDjango({
      full_name: farmerName,
      phone,
      email,
      farm_name,
      address: address || district,
      chicken_type,
      preferred_language,
      latitude,
      longitude,
    });

    // 3. Also save to local call-centre DB for call linkage
    await query(
      `INSERT INTO farmers (name, phone, district, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (phone) DO NOTHING`,
      [farmerName, phone, district || '', notes || '']
    ).catch(() => {}); // ignore if local insert fails

    logger.info('Farmer created in Django', { phone, name: farmerName });
    res.status(201).json({ farmer: result, created_in: 'django' });

  } catch (err) {
    const body = err.body || {};
    logger.error('createFarmer error', { phone, error: err.message, body });
    // If Django says duplicate, treat as success
    if (body.phone?.[0]?.includes('already exists')) {
      const existing = await djangoGetByPhone(phone).catch(() => null);
      return res.status(200).json({ farmer: existing, already_exists: true });
    }
    res.status(400).json({ error: err.message, detail: body });
  }
}

export async function updateFarmer(req, res) {
  // Update in local DB only (Django updates happen via the app)
  const { farmerId } = req.params;
  const { notes, district } = req.body;
  const { rows } = await query(
    `UPDATE farmers SET notes = COALESCE($1, notes), district = COALESCE($2, district), updated_at = NOW()
     WHERE id = $3 OR phone = $3 RETURNING *`,
    [notes, district, farmerId]
  );
  res.json(rows[0] || { updated: false });
}

export async function getDistricts(req, res) {
  // Extract districts from the live Django dataset
  try {
    const { farmers } = await djangoList({ search: '', page: 1 });
    const districts = [...new Set(
      farmers.map(f => f.district).filter(Boolean).sort()
    )];
    res.json(districts);
  } catch {
    res.json([]);
  }
}

export function getUnknownFarmerTemplate(req, res) {
  const { phone } = req.query;
  res.json({
    farmer: { id: null, name: '', phone: phone || '', district: null, notes: null },
    farms: [],
    batches: [],
    call_history: [],
    is_unknown: true,
  });
}
