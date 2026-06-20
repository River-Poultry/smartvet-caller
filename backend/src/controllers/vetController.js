/**
 * Vet controller — serves live data from the Django SmartVet backend.
 * Dispatch assignments are stored in local call-centre DB only.
 */
import { query } from '../config/db.js';
import { broadcast } from '../services/websocket.js';
import { listVets as djangoList } from '../services/smartvetCore.js';
import { logger } from '../config/logger.js';

export async function listVets(req, res) {
  const { available, role, search = '', page = 1 } = req.query;

  try {
    const { count, vets } = await djangoList({ search, page });

    // Apply client-side filters (Django API doesn't support all our filters yet)
    let filtered = vets;
    if (available === 'true') filtered = filtered.filter(v => v.is_available);
    if (role) filtered = filtered.filter(v => v.role === role);

    // Enrich with local dispatch stats
    const djangoIds = filtered.map(v => v.django_id).filter(Boolean);
    let dispatchStats = {};
    if (djangoIds.length) {
      const { rows } = await query(
        `SELECT assigned_paravet_id, count(*) as completed_visits
         FROM vet_dispatch_requests
         WHERE assigned_paravet_id = ANY($1) AND status = 'completed'
         GROUP BY assigned_paravet_id`,
        [djangoIds.map(String)]
      );
      rows.forEach(r => { dispatchStats[r.assigned_paravet_id] = parseInt(r.completed_visits); });
    }

    const enriched = filtered.map(v => ({
      ...v,
      total_visits: dispatchStats[String(v.django_id)] || 0,
    }));

    res.json({ vets: enriched, total: count });
  } catch (err) {
    logger.error('listVets error', { error: err.message });
    res.status(502).json({ error: 'Could not reach SmartVet backend', detail: err.message });
  }
}

export async function getVet(req, res) {
  const { vetId } = req.params;
  // vetId is "django-vet-{id}" or raw numeric
  const djangoId = vetId.replace('django-vet-', '');

  try {
    // Find in live Django list
    const { vets } = await djangoList({ search: '' });
    const vet = vets.find(v => String(v.django_id) === djangoId);
    if (!vet) return res.status(404).json({ error: 'Vet not found' });

    // Recent dispatches from local DB
    const { rows: dispatches } = await query(
      `SELECT d.id, d.created_at, d.urgency_level, d.status, d.visit_type,
              d.symptoms_description, d.farmer_name, d.farmer_phone
       FROM vet_dispatch_requests d
       WHERE d.assigned_paravet_id = $1 OR d.assigned_paravet_id = $2
       ORDER BY d.created_at DESC LIMIT 10`,
      [vetId, djangoId]
    );

    res.json({ vet, recent_dispatches: dispatches });
  } catch (err) {
    logger.error('getVet error', { vetId, error: err.message });
    res.status(502).json({ error: 'Could not reach SmartVet backend' });
  }
}

export async function assignVetToDispatch(req, res) {
  const { dispatchId } = req.params;
  const { vet_id } = req.body;
  if (!vet_id) return res.status(400).json({ error: 'vet_id required' });

  // Resolve vet from Django list
  const djangoId = String(vet_id).replace('django-vet-', '');
  const { vets } = await djangoList({ search: '' }).catch(() => ({ vets: [] }));
  const vet = vets.find(v => String(v.django_id) === djangoId || v.id === vet_id);
  if (!vet) return res.status(404).json({ error: 'Vet not found' });

  const { rows } = await query(
    `UPDATE vet_dispatch_requests
     SET assigned_paravet_id = $1,
         assigned_paravet_name = $2,
         assigned_paravet_phone = $3,
         status = 'assigned',
         updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [vet_id, vet.name, vet.phone, dispatchId]
  );

  if (!rows.length) return res.status(404).json({ error: 'Dispatch not found' });

  broadcast('DISPATCH_UPDATED', { dispatch: rows[0] });
  broadcast('VET_ASSIGNED', { vetId: vet_id, dispatchId });

  res.json({ dispatch: rows[0], vet: { name: vet.name, phone: vet.phone } });
}

export async function toggleAvailability(req, res) {
  // Availability is now managed by the Django backend; this is a no-op in the call centre
  res.json({ message: 'Availability is managed by the SmartVet app' });
}

export async function getNearbyVets(req, res) {
  const { lat, lng, radius_km = 50 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  try {
    const { vets } = await djangoList({ search: '' });
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius_km);

    const nearby = vets
      .filter(v => v.latitude && v.longitude)
      .map(v => {
        const dlat = v.latitude - userLat;
        const dlng = v.longitude - userLng;
        const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
        return { ...v, distance_km: Math.round(dist * 10) / 10 };
      })
      .filter(v => v.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 10);

    res.json(nearby);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach SmartVet backend' });
  }
}
