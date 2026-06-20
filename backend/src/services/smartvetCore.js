/**
 * SmartVet Core API bridge — connects to the live Django backend at smartvet.africa
 * API is AllowAny so no auth token needed for reads.
 * Writes (create farmer) use the /auth/api/signup/ endpoint.
 */
import { logger } from '../config/logger.js';

const BASE = process.env.SMARTVET_CORE_API || 'https://smartvet.africa';

async function get(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`SmartVet ${res.status} ${url}`);
  return res.json();
}

async function post(path, body) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(`SmartVet ${res.status}`), { body: data });
  return data;
}

/** Look up a farmer by phone number from the live Django system */
export async function getFarmerByPhone(phone) {
  try {
    const data = await get(`/vet/farmers/?search=${encodeURIComponent(phone)}&format=json`);
    const farmer = data.results?.find(f => f.phone === phone || f.whatsapp === phone);
    if (!farmer) return null;
    return normalizeFarmer(farmer);
  } catch (err) {
    logger.warn('getFarmerByPhone failed', { phone, error: err.message });
    return null;
  }
}

/** Get paginated farmer list from Django, with optional search */
export async function listFarmers({ search = '', page = 1 } = {}) {
  try {
    const params = new URLSearchParams({ format: 'json', page });
    if (search) params.set('search', search);
    const data = await get(`/vet/farmers/?${params}`);
    return {
      count: data.count,
      farmers: (data.results || []).map(normalizeFarmer),
      next: data.next,
    };
  } catch (err) {
    logger.warn('listFarmers failed', { error: err.message });
    return { count: 0, farmers: [], next: null };
  }
}

/** Get paginated vet list from Django */
export async function listVets({ search = '', page = 1 } = {}) {
  try {
    const params = new URLSearchParams({ format: 'json', page });
    if (search) params.set('search', search);
    const data = await get(`/vet/vets/?${params}`);
    return {
      count: data.count,
      vets: (data.results || []).map(normalizeVet),
      next: data.next,
    };
  } catch (err) {
    logger.warn('listVets failed', { error: err.message });
    return { count: 0, vets: [], next: null };
  }
}

/** Get a single farmer's batches from Django */
export async function getFarmerBatches(djangoFarmerId) {
  try {
    const data = await get(`/vet/api/farmers/${djangoFarmerId}/batches/?format=json`);
    return data.batches || data.results || data || [];
  } catch (err) {
    logger.warn('getFarmerBatches failed', { djangoFarmerId, error: err.message });
    return [];
  }
}

/** Create a new farmer in the Django system via signup */
export async function createFarmerInDjango({ full_name, phone, email, farm_name, address, chicken_type, preferred_language, latitude, longitude }) {
  // Django signup creates both User + FarmerProfile in one shot
  const [first_name, ...rest] = (full_name || 'Unknown').split(' ');
  const last_name = rest.join(' ') || full_name;

  return post('/auth/api/signup/', {
    user_type: 'farmer',
    first_name,
    last_name,
    phone,
    email: email || `${phone.replace(/\+/g, '')}@smartvet.auto`,
    password: `sv_${phone.slice(-6)}_auto`,  // auto-generated password, farmer logs in via OTP
    farm_name: farm_name || '',
    address: address || '',
    chicken_type: chicken_type || '',
    preferred_language: preferred_language || 'English',
    latitude: latitude || null,
    longitude: longitude || null,
  });
}

/** Get available paravets near a location */
export async function getAvailableParavets({ lat, lng, urgency }) {
  try {
    // Django API doesn't have availability filtering yet — return all active vets
    const data = await get('/vet/vets/?format=json');
    return (data.results || []).map(normalizeVet).slice(0, 5);
  } catch (err) {
    logger.warn('getAvailableParavets failed', err.message);
    return [];
  }
}

/** Create a vet dispatch request in Django (not yet implemented — stored locally only) */
export async function createVetRequest(dispatchData) {
  // Django doesn't have a dispatch API yet; stored in local call-centre DB only
  logger.info('createVetRequest: local-only', { farmer: dispatchData.farmer_name });
  return null;
}

/** Query knowledge base — currently uses local diagnosis engine, not Django */
export async function queryKnowledgeBase({ symptoms, animalType }) {
  // SmartVet's KB is the search page at smartvet.africa/?q=...
  // For structured diagnosis we use the local diseaseDiagnosis.js engine.
  return null;
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeFarmer(f) {
  return {
    id: `django-${f.id}`,          // prefix to avoid PK collisions with local DB
    django_id: f.id,
    name: f.fullname,
    full_name: f.fullname,
    phone: f.phone,
    whatsapp: f.whatsapp,
    email: f.email,
    farm_name: f.farm_name,
    address: f.address,
    district: extractDistrict(f.address),
    latitude: f.latitude,
    longitude: f.longitude,
    chicken_type: normalizeChickenType(f.chicken_type),
    preferred_language: f.preferred_language,
    is_active: f.is_active,
    profile_picture: f.profile_picture,
    matched_vet_id: f.matched_vet,
    assigned_vet: f.assigned_vet_info ? {
      id: f.assigned_vet_info.id,
      name: f.assigned_vet_info.fullname,
      phone: f.assigned_vet_info.phone,
      specialization: f.assigned_vet_info.specialization,
    } : null,
    total_batches: f.total_batches || 0,
    active_batches: f.active_batches || 0,
    total_birds: f.total_birds || 0,
    source: 'django',
  };
}

function normalizeVet(v) {
  return {
    id: `django-vet-${v.id}`,
    django_id: v.id,
    name: v.fullname,
    phone: v.phone,
    email: v.email,
    role: v.experience_years >= 3 ? 'vet' : 'paravet',
    specialisation: v.specialization || 'Poultry & Livestock',
    district: extractDistrict(v.address),
    address: v.address,
    latitude: v.latitude,
    longitude: v.longitude,
    rating: Math.min(5, 3.5 + (v.current_load_percentage || 0) / 100),
    is_available: v.current_load < v.max_load,
    total_visits: v.assigned_batches_count || 0,
    current_load: v.current_load,
    max_load: v.max_load,
    source: 'django',
  };
}

function extractDistrict(address) {
  if (!address) return '';
  // Try to get last meaningful word as district
  const parts = address.split(',').map(s => s.trim());
  return parts[parts.length - 1] || address;
}

function normalizeChickenType(raw) {
  if (!raw) return 'mixed';
  const l = raw.toLowerCase();
  if (l.includes('broil')) return 'broiler';
  if (l.includes('layer')) return 'layer';
  if (l.includes('sasso')) return 'sasso';
  if (l.includes('kuroil') || l.includes('kroil')) return 'kuroiler';
  if (l.includes('rainbow')) return 'rainbow_rooster';
  return l;
}
