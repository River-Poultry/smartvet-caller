import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Phone, Star, CheckCircle, XCircle, Stethoscope, Users } from 'lucide-react';
import api from '../services/api.js';
import { Badge } from '../components/shared/Badge.jsx';
import { Button } from '../components/shared/Button.jsx';
import { Logo } from '../components/shared/Logo.jsx';
import { ThemeToggle } from '../components/shared/ThemeToggle.jsx';
import { useAuthStore } from '../store/authStore.js';

function VetCard({ vet, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-sv-border/50 hover:bg-sv-bg-input transition-colors ${
        selected ? 'bg-sv-bg-input border-l-2 border-l-sv-green' : ''
      }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${vet.is_available ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-gray-600'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-medium text-white truncate">{vet.name}</p>
            <Badge variant={vet.role === 'vet' ? 'blue' : 'green'} className="text-xs capitalize flex-shrink-0">
              {vet.role}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Phone size={10} /> {vet.phone}
          </p>
          {vet.district && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {[vet.sub_county, vet.district].filter(Boolean).join(', ')}
            </p>
          )}
          {vet.specialisation && (
            <p className="text-xs text-gray-600 mt-0.5 truncate">{vet.specialisation}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-0.5 text-xs text-amber-400">
            <Star size={11} fill="currentColor" />
            <span className="font-medium">{vet.rating?.toFixed(1) || '—'}</span>
          </div>
          <span className="text-xs text-gray-600">{vet.total_visits || 0} visits</span>
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
    <div className="max-w-xl space-y-5">
      {/* Profile */}
      <div className="bg-sv-bg-card border border-sv-border rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">{vet.name}</h2>
              <Badge variant={vet.role === 'vet' ? 'blue' : 'green'} className="capitalize">{vet.role}</Badge>
            </div>
            <p className="text-gray-400 flex items-center gap-1.5 text-sm">
              <Phone size={13} /> {vet.phone}
            </p>
            {vet.district && (
              <p className="text-gray-400 flex items-center gap-1.5 text-sm mt-1">
                <MapPin size={13} /> {[vet.sub_county, vet.district].filter(Boolean).join(', ')}
              </p>
            )}
            {vet.specialisation && (
              <p className="text-sv-green text-sm mt-1">
                <Stethoscope size={13} className="inline mr-1" />
                {vet.specialisation}
              </p>
            )}
          </div>

          {/* Rating + status */}
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-400 mb-1.5 justify-end">
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={14}
                  fill={n <= Math.round(vet.rating || 0) ? 'currentColor' : 'none'}
                  className={n <= Math.round(vet.rating || 0) ? '' : 'text-gray-700'} />
              ))}
              <span className="text-sm font-semibold ml-1">{vet.rating?.toFixed(1)}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm justify-end ${vet.is_available ? 'text-green-400' : 'text-gray-500'}`}>
              {vet.is_available ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {vet.is_available ? 'Available now' : 'On job / Unavailable'}
            </div>
            <p className="text-xs text-gray-500 mt-1">{vet.total_visits || 0} completed visits</p>
          </div>
        </div>

        {/* Assign button (when coming from dispatch) */}
        {dispatchId && (
          <Button
            variant={vet.is_available ? 'primary' : 'secondary'}
            className="w-full flex items-center justify-center gap-2 mt-2"
            disabled={!vet.is_available || assigning}
            onClick={handleAssign}
          >
            {assigning ? 'Assigning…' : vet.is_available
              ? `✓ Assign ${vet.name} to this Dispatch`
              : 'Currently Unavailable'}
          </Button>
        )}
      </div>

      {/* Recent dispatches */}
      {detail?.recent_dispatches?.length > 0 && (
        <div className="bg-sv-bg-card border border-sv-border rounded-xl">
          <div className="px-4 py-3 border-b border-sv-border">
            <h3 className="text-sm font-semibold text-white">Recent Dispatches</h3>
          </div>
          {detail.recent_dispatches.map(d => (
            <div key={d.id} className="px-4 py-3 border-b border-sv-border/50 last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white">{d.farmer_name || d.farmer_phone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.visit_type}</p>
                  {d.symptoms_description && (
                    <p className="text-xs text-gray-600 mt-0.5 truncate max-w-xs">{d.symptoms_description}</p>
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

      {!detail && (
        <p className="text-gray-600 text-sm text-center py-4">Loading dispatch history…</p>
      )}
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
    { to: '/agent', label: 'Dashboard' },
    { to: '/agent/farmers', label: 'Farmers' },
    { to: '/agent/vets', label: 'Vets', active: true },
  ];

  const available = vets.filter(v => v.is_available).length;

  return (
    <div className="min-h-screen bg-sv-bg flex flex-col">
      <header className="flex items-center gap-4 px-5 py-2.5 border-b border-sv-border bg-sv-bg-card">
        <Logo size="sm" />
        <nav className="flex items-center gap-1">
          {NAV.map(n => (
            <button key={n.to} onClick={() => navigate(n.to)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                n.active ? 'text-sv-green bg-sv-bg-input' : 'text-gray-500 hover:text-gray-300 hover:bg-sv-bg-input'
              }`}>
              {n.label}
            </button>
          ))}
        </nav>
        {dispatchId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/40 border border-amber-700 rounded-lg">
            <span className="text-xs text-amber-300">🚑 Assigning vet to dispatch #{dispatchId.slice(0,8)}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-gray-400">{agent?.name}</span>
          <button onClick={logout} className="text-gray-500 hover:text-white text-sm">Logout</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-80 flex-shrink-0 border-r border-sv-border flex flex-col bg-sv-bg-card">
          <div className="p-3 space-y-2 border-b border-sv-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">Vets & Paravets</span>
              <span className="text-xs">
                <span className="text-green-400">{available} available</span>
                <span className="text-gray-600"> / {total}</span>
              </span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name or phone…"
                className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sv-green" />
            </div>
            <div className="flex gap-2 items-center">
              <select value={role} onChange={e => setRole(e.target.value)}
                className="flex-1 bg-sv-bg-input border border-sv-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sv-green">
                <option value="">All roles</option>
                <option value="vet">Veterinarians</option>
                <option value="paravet">Paravets</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)}
                  className="accent-sv-green" />
                Only available
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading && <p className="text-gray-600 text-sm p-4 text-center">Loading…</p>}
            {!loading && vets.length === 0 && <p className="text-gray-600 text-sm p-4 text-center">No vets found</p>}
            {vets.map(vet => (
              <VetCard key={vet.id} vet={vet} selected={selected?.id === vet.id} onClick={() => setSelected(vet)} />
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto p-6 bg-sv-bg">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Stethoscope size={48} className="opacity-20 mb-3" />
              <p>Select a vet to view their profile</p>
              {dispatchId && (
                <p className="text-amber-500 text-sm mt-2">Then click "Assign to Dispatch" to assign them</p>
              )}
            </div>
          ) : (
            <VetDetail key={selected.id} vet={selected} dispatchId={dispatchId} onAssign={handleAssign} />
          )}
        </div>
      </div>
    </div>
  );
}
