/**
 * CallerPanel — left panel shown during a call.
 * Handles: unknown callers, farmer search/select, farmer profile, quick-register.
 */
import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Phone, MapPin, ChevronDown, ChevronUp,
         Layers, AlertCircle, X, Check } from 'lucide-react';
import { useCallStore } from '../../store/callStore.js';
import api from '../../services/api.js';

const ESCALATION_LABELS = {
  1: { label: 'L1 · Agent', color: 'text-gray-400 border-gray-600' },
  2: { label: 'L2 · Paravet', color: 'text-blue-400 border-blue-600' },
  3: { label: 'L3 · Vet', color: 'text-amber-400 border-amber-600' },
  4: { label: 'L4 · Emergency', color: 'text-red-400 border-red-600 animate-pulse' },
};

function FarmerProfile({ farmer }) {
  const [batches, setBatches] = useState([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!farmer?.django_id) return;
    api.get(`/farmers/${farmer.id}`).then(r => {
      setBatches(r.data.batches || []);
    }).catch(() => {});
  }, [farmer?.id]);

  if (!farmer) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="bg-sv-green/8 border border-sv-green/20 rounded-lg p-2.5">
        <p className="text-xs font-bold text-white truncate">{farmer.name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={10} />{farmer.phone}</p>
        {farmer.district && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} />{farmer.district}</p>}
        {farmer.chicken_type && (
          <span className="mt-1.5 inline-block text-xs bg-sv-teal/15 text-sv-teal border border-sv-teal/30 px-1.5 py-0.5 rounded capitalize">
            {farmer.chicken_type}
          </span>
        )}
        {farmer.assigned_vet && (
          <p className="text-xs text-gray-500 mt-1">Assigned vet: {farmer.assigned_vet.name}</p>
        )}
      </div>

      {batches.length > 0 && (
        <div className="border border-sv-border rounded-lg overflow-hidden">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-sv-bg-input text-xs text-gray-400 hover:text-white transition-colors">
            <span>Batches ({batches.length})</span>
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {open && batches.slice(0, 4).map((b, i) => (
            <div key={i} className="px-2.5 py-1.5 border-t border-sv-border/50 text-xs">
              <p className="text-white font-medium">{b.bird_type || b.batch_name || `Batch ${i+1}`}</p>
              <p className="text-gray-500">{b.number_of_birds || b.quantity} birds · {b.age_weeks || b.age || '?'} wks</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COUNTRY_CODES = [
  { code: '+256', label: 'UG +256' },
  { code: '+254', label: 'KE +254' },
  { code: '+255', label: 'TZ +255' },
  { code: '+250', label: 'RW +250' },
  { code: '+257', label: 'BI +257' },
  { code: '+211', label: 'SS +211' },
  { code: '+243', label: 'CD +243' },
];

const CHICKEN_TYPES = ['Broilers', 'Layers', 'Sasso', 'Kroiler/Kiyenyeji'];

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-sv-text-muted uppercase tracking-wider mb-1">
        {label}{required && <span className="text-sv-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full bg-sv-bg-input border border-sv-border rounded-lg px-3 py-2 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green transition-colors';
const SELECT_CLS = `${INPUT_CLS} appearance-none cursor-pointer`;

function QuickRegisterForm({ phone, onDone }) {
  const [countryCode, setCountryCode] = useState('+256');
  const [form, setForm] = useState({
    name: '',
    phone: phone ? phone.replace(/^\+\d+/, '') : '',
    email: '',
    farm_name: '',
    farm_location: '',
    chicken_type: '',
    vet_support: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Farmer name is required'); return; }
    if (!form.phone.trim()) { setError('Phone number is required'); return; }
    setSaving(true);
    setError('');
    try {
      const fullPhone = `${countryCode}${form.phone.replace(/^0/, '')}`;
      const { data } = await api.post('/farmers', {
        full_name: form.name.trim(),
        phone: fullPhone,
        email: form.email.trim() || undefined,
        farm_name: form.farm_name.trim() || undefined,
        address: form.farm_location.trim() || undefined,
        chicken_type: form.chicken_type || undefined,
        needs_vet_support: form.vet_support === 'yes',
      });
      onDone(data.farmer || data);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed — please try again');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3 mt-1">
      {/* Section: Personal */}
      <div className="rounded-lg border border-sv-border bg-sv-bg/40 p-3 space-y-2.5">
        <p className="text-[10px] font-bold text-sv-green uppercase tracking-widest">Personal Info</p>

        <Field label="Farmer Name" required>
          <input type="text" value={form.name} onChange={set('name')} placeholder="Full name"
            className={INPUT_CLS} />
        </Field>

        <Field label="Phone Number" required>
          <div className="flex gap-1.5">
            <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
              className="bg-sv-bg-input border border-sv-border rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sv-green appearance-none cursor-pointer flex-shrink-0">
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="7XX XXX XXX"
              className={INPUT_CLS} />
          </div>
        </Field>

        <Field label="Email Address">
          <input type="email" value={form.email} onChange={set('email')} placeholder="farmer@example.com"
            className={INPUT_CLS} />
        </Field>
      </div>

      {/* Section: Farm */}
      <div className="rounded-lg border border-sv-border bg-sv-bg/40 p-3 space-y-2.5">
        <p className="text-[10px] font-bold text-sv-teal uppercase tracking-widest">Farm Details</p>

        <Field label="Farm Name">
          <input type="text" value={form.farm_name} onChange={set('farm_name')} placeholder="e.g. Okello Farm"
            className={INPUT_CLS} />
        </Field>

        <Field label="Farm Location">
          <input type="text" value={form.farm_location} onChange={set('farm_location')} placeholder="District / village / address"
            className={INPUT_CLS} />
        </Field>

        <Field label="Type of Chicken" required>
          <select value={form.chicken_type} onChange={set('chicken_type')} className={SELECT_CLS}>
            <option value="">Select chicken type…</option>
            {CHICKEN_TYPES.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
          </select>
        </Field>

        <Field label="Need Vet Support?">
          <div className="flex gap-3 mt-0.5">
            {['yes', 'no'].map(v => (
              <label key={v} className={`flex items-center gap-2 flex-1 rounded-lg border px-3 py-2 cursor-pointer text-xs font-medium transition-all ${
                form.vet_support === v
                  ? 'border-sv-green bg-sv-green/10 text-white'
                  : 'border-sv-border text-sv-text-muted hover:border-sv-green/40'
              }`}>
                <input type="radio" name="vet_support" value={v}
                  checked={form.vet_support === v}
                  onChange={set('vet_support')}
                  className="sr-only" />
                {v === 'yes' ? '✅ Yes' : '❌ No'}
              </label>
            ))}
          </div>
        </Field>
      </div>

      {error && (
        <p className="text-xs text-sv-red bg-sv-red/10 border border-sv-red/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 py-2 bg-sv-green hover:bg-sv-green-d text-white text-xs rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
          <Check size={12} /> {saving ? 'Registering…' : 'Register & Link Farmer'}
        </button>
        <button type="button" onClick={() => onDone(null)}
          className="px-3 py-2 border border-sv-border text-sv-text-muted text-xs rounded-lg hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>
    </form>
  );
}

export function CallerPanel({ activeCall, onFarmerSelect }) {
  const { callNotes } = useCallStore();
  const [mode, setMode] = useState('search'); // 'search' | 'register' | 'profile'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(activeCall?.farmer || null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (activeCall?.farmer?.id) {
      setSelectedFarmer(activeCall.farmer);
      setMode('profile');
    } else {
      setMode('search');
      setSelectedFarmer(null);
    }
  }, [activeCall?.farmer?.id]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/farmers?search=${encodeURIComponent(query)}&limit=8`);
        setResults(data.farmers || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  function selectFarmer(farmer) {
    setSelectedFarmer(farmer);
    setMode('profile');
    setQuery('');
    setResults([]);
    onFarmerSelect?.(farmer);
  }

  function registered(farmer) {
    if (farmer) { selectFarmer(farmer); }
    else setMode('search');
  }

  if (!activeCall) return (
    <div className="p-3 text-xs text-gray-600 text-center">No active call</div>
  );

  return (
    <div className="p-3 space-y-2">
      {/* Caller info bar */}
      <div className="flex items-center gap-2">
        <Phone size={12} className="text-sv-green flex-shrink-0" />
        <span className="text-xs text-white font-mono truncate">{activeCall.phone_number || activeCall.farmer?.phone || 'Unknown'}</span>
        {activeCall.is_demo && <span className="text-xs text-amber-400 border border-amber-700 px-1 rounded">DEMO</span>}
      </div>

      {mode === 'search' && (
        <>
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle size={11} /> Caller not in system
          </p>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search farmer by name or phone…"
              className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-sv-green" />
          </div>

          {searching && <p className="text-xs text-gray-600 text-center">Searching…</p>}
          {results.length > 0 && (
            <div className="border border-sv-border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
              {results.map(f => (
                <button key={f.id} onClick={() => selectFarmer(f)}
                  className="w-full text-left px-2.5 py-2 border-b border-sv-border/50 last:border-0 hover:bg-sv-bg-input transition-colors">
                  <p className="text-xs text-white font-medium">{f.name}</p>
                  <p className="text-xs text-gray-500">{f.phone} · {f.district}</p>
                </button>
              ))}
            </div>
          )}
          {!searching && query && results.length === 0 && (
            <p className="text-xs text-gray-600 text-center">No match — <button onClick={() => setMode('register')} className="text-sv-green underline">register new</button></p>
          )}

          <button onClick={() => setMode('register')}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-sv-green/40 text-sv-green text-xs rounded-lg hover:bg-sv-green/10 transition-colors">
            <UserPlus size={12} /> Register New Farmer
          </button>
        </>
      )}

      {mode === 'register' && (
        <QuickRegisterForm phone={activeCall.phone_number} onDone={registered} />
      )}

      {mode === 'profile' && selectedFarmer && (
        <>
          <button onClick={() => setMode('search')} className="text-xs text-gray-500 hover:text-sv-green transition-colors flex items-center gap-1">
            <Search size={10} /> Change farmer
          </button>
          <FarmerProfile farmer={selectedFarmer} />
        </>
      )}
    </div>
  );
}
