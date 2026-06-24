import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Phone, Star, CheckCircle, XCircle, Stethoscope, LogOut, ArrowLeft } from 'lucide-react';
import api from '../services/api.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Logo } from '../components/ui/Logo.jsx';
import { ThemeToggle } from '../components/ui/ThemeToggle.jsx';
import { OutreachPanel } from '../components/features/agent/OutreachPanel.jsx';
import { useAuthStore } from '../store/authStore.js';

function VetCard({ vet, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        selected ? 'bg-green-50 border-l-2 border-l-green-600' : ''
      }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${vet.is_available ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-medium text-gray-900 truncate">{vet.name}</p>
            <Badge variant={vet.role === 'vet' ? 'blue' : 'green'} className="text-xs capitalize flex-shrink-0">
              {vet.role}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Phone size={10} /> {vet.phone}
          </p>
          {vet.district && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {[vet.sub_county, vet.district].filter(Boolean).join(', ')}
            </p>
          )}
          {vet.specialisation && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{vet.specialisation}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-0.5 text-xs text-amber-500">
            <Star size={11} fill="currentColor" />
            <span className="font-medium">{vet.rating?.toFixed(1) || '—'}</span>
          </div>
          <span className="text-xs text-gray-400">{vet.total_visits || 0} visits</span>
        </div>
      </div>
    </button>
  );
}

function VetDetail({ vet, dispatchId, onAssign }) {
  const [detail, setDetail] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setDetail(null);
    api.get(`/vets/${vet.id}`).then(r => setDetail(r.data)).catch(() => {});
  }, [vet.id]);

  async function handleAssign() {
    setAssigning(true);
    await onAssign(vet.id);
    setAssigning(false);
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{vet.name}</h2>
              <Badge variant={vet.role === 'vet' ? 'blue' : 'green'} className="capitalize">{vet.role}</Badge>
            </div>
            <p className="text-gray-500 flex items-center gap-1.5 text-sm">
              <Phone size={13} /> {vet.phone}
            </p>
            {vet.district && (
              <p className="text-gray-500 flex items-center gap-1.5 text-sm mt-1">
                <MapPin size={13} /> {[vet.sub_county, vet.district].filter(Boolean).join(', ')}
              </p>
            )}
            {vet.specialisation && (
              <p className="text-green-700 text-sm mt-1">
                <Stethoscope size={13} className="inline mr-1" />
                {vet.specialisation}
              </p>
            )}
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-500 mb-1.5 justify-end">
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={13}
                  fill={n <= Math.round(vet.rating || 0) ? 'currentColor' : 'none'}
                  className={n <= Math.round(vet.rating || 0) ? '' : 'text-gray-200'} />
              ))}
              <span className="text-sm font-semibold text-gray-800 ml-1">{vet.rating?.toFixed(1)}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm justify-end ${vet.is_available ? 'text-green-600' : 'text-gray-400'}`}>
              {vet.is_available ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {vet.is_available ? 'Available now' : 'Unavailable'}
            </div>
            <p className="text-xs text-gray-400 mt-1">{vet.total_visits || 0} completed visits</p>
          </div>
        </div>

        {dispatchId && (
          <Button variant={vet.is_available ? 'primary' : 'secondary'}
            className="w-full flex items-center justify-center gap-2 mt-2"
            disabled={!vet.is_available || assigning} onClick={handleAssign}>
            {assigning ? 'Assigning…' : vet.is_available
              ? `✓ Assign ${vet.name} to this Dispatch`
              : 'Currently Unavailable'}
          </Button>
        )}

        <OutreachPanel farmer={{ id: vet.id, name: vet.name, phone: vet.phone }} activeCall={null} recipientType="vet" />
      </div>

      {detail?.recent_dispatches?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Recent Dispatches</h3>
          </div>
          {detail.recent_dispatches.map(d => (
            <div key={d.id} className="px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-900">{d.farmer_name || d.farmer_phone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.visit_type}</p>
                  {d.symptoms_description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{d.symptoms_description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                  <Badge variant={d.urgency_level === 'emergency' ? 'red' : 'blue'} className="capitalize text-xs">
                    {d.urgency_level}
                  </Badge>
                  <Badge variant={d.status === 'completed' ? 'green' : d.status === 'assigned' ? 'blue' : 'gray'} className="capitalize text-xs">
                    {d.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!detail && <p className="text-gray-400 text-sm text-center py-4">Loading dispatch history…</p>}
    </div>
  );
}

export default function VetsList() {
  const { agent, logout } = useAuthStore();
  const [vets, setVets] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const dispatchId = searchParams.get('assign_dispatch');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (availableOnly) params.set('available', 'true');
      const { data } = await api.get(`/vets?${params}`);
      setVets(data.vets);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, role, availableOnly]);

  async function handleAssign(vetId) {
    if (!dispatchId) return;
    await api.post(`/vets/dispatch/${dispatchId}/assign`, { vet_id: vetId });
    navigate(-1);
  }

  const NAV = [
    { to: '/agent',          label: 'Dashboard' },
    { to: '/agent/farmers',  label: 'Farmers' },
    { to: '/agent/vets',     label: 'Vets', active: true },
  ];

  const available = vets.filter(v => v.is_available).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-20 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)', boxShadow: '0 2px 12px rgba(15,23,42,0.22)' }}>
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2.5">
          {selected && (
            <button onClick={() => setSelected(null)} className="md:hidden p-1.5 -ml-0.5 text-green-200 hover:text-white">
              <ArrowLeft size={18} />
            </button>
          )}
          <Logo size="sm" imgClassName="brightness-0 invert" />
          <div className="h-7 w-px bg-white/20 hidden sm:block" />
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {NAV.map(n => (
              <button key={n.to} onClick={() => navigate(n.to)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  n.active ? 'bg-white text-green-800 shadow-sm' : 'text-green-100 hover:bg-white/15 hover:text-white'
                }`}>
                {n.label}
              </button>
            ))}
          </nav>
          {dispatchId && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-400/20 border border-amber-300/40 rounded-lg">
              <span className="text-xs text-amber-200 font-semibold">🚑 Assigning vet to dispatch #{dispatchId.slice(0,8)}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="text-sm font-semibold text-green-100 hidden sm:inline">{agent?.name}</span>
            <button onClick={logout} className="text-green-200 hover:text-red-300 transition-all p-1.5 rounded-lg hover:bg-white/10">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Desktop layout (md+): side-by-side ── */}
      <div className="hidden md:flex flex-1 overflow-hidden mx-5 mb-5 mt-4 gap-4">
        <div className="w-80 flex-shrink-0 border border-gray-200 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 space-y-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-900">Vets &amp; Paravets</span>
              <span className="text-xs">
                <span className="text-green-600 font-medium">{available} available</span>
                <span className="text-gray-400"> / {total}</span>
              </span>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name or phone…"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600" />
            </div>
            <div className="flex gap-2 items-center">
              <select value={role} onChange={e => setRole(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600">
                <option value="">All roles</option>
                <option value="vet">Veterinarians</option>
                <option value="paravet">Paravets</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} className="accent-green-700" />
                Available only
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading && <p className="text-gray-400 text-sm p-4 text-center">Loading…</p>}
            {!loading && vets.length === 0 && <p className="text-gray-400 text-sm p-4 text-center">No vets found</p>}
            {vets.map(vet => (
              <VetCard key={vet.id} vet={vet} selected={selected?.id === vet.id} onClick={() => setSelected(vet)} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <Stethoscope size={48} className="mb-3" />
              <p className="text-gray-500">Select a vet to view their profile</p>
              {dispatchId && <p className="text-amber-500 text-sm mt-2">Then click "Assign to Dispatch"</p>}
            </div>
          ) : (
            <VetDetail key={selected.id} vet={selected} dispatchId={dispatchId} onAssign={handleAssign} />
          )}
        </div>
      </div>

      {/* ── Mobile layout (<md): list → detail drill-down ── */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden mx-3 mb-3 mt-3">
        {!selected ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-3 space-y-2 border-b border-gray-200">
              {dispatchId && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-xs text-amber-700">🚑 Assigning vet to dispatch #{dispatchId.slice(0,8)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Vets &amp; Paravets</span>
                <span className="text-xs">
                  <span className="text-green-600 font-medium">{available} available</span>
                  <span className="text-gray-400"> / {total}</span>
                </span>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name or phone…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600" />
              </div>
              <div className="flex gap-2 items-center">
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600">
                  <option value="">All roles</option>
                  <option value="vet">Veterinarians</option>
                  <option value="paravet">Paravets</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} className="accent-green-700" />
                  Available only
                </label>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && <p className="text-gray-400 text-sm p-4 text-center">Loading…</p>}
              {!loading && vets.length === 0 && <p className="text-gray-400 text-sm p-4 text-center">No vets found</p>}
              {vets.map(vet => (
                <VetCard key={vet.id} vet={vet} selected={false} onClick={() => setSelected(vet)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <VetDetail key={selected.id} vet={selected} dispatchId={dispatchId} onAssign={handleAssign} />
          </div>
        )}
      </div>
    </div>
  );
}
