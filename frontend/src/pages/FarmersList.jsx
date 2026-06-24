import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MapPin, Users, Stethoscope, Calendar, AlertTriangle, LogOut, ArrowLeft } from 'lucide-react';
import api from '../services/api.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Logo } from '../components/ui/Logo.jsx';
import { ThemeToggle } from '../components/ui/ThemeToggle.jsx';
import { VetDispatchModal } from '../components/features/agent/VetDispatchModal.jsx';
import { OutreachPanel } from '../components/features/agent/OutreachPanel.jsx';
import { useAuthStore } from '../store/authStore.js';
import { useCallStore } from '../store/callStore.js';

const STAGE_COLOR = { brooding: 'blue', growing: 'green', finishing: 'yellow', laying: 'green' };

function BatchCard({ batch }) {
  const pendingTasks = (batch.tasks || []).filter(t => t.status === 'pending');
  const overdueTasks = pendingTasks.filter(t => new Date(t.scheduled_at) < new Date());
  const upcomingVaccinations = pendingTasks
    .filter(t => t.task_type === 'vaccination')
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 3);

  const healthPct = batch.total_birds > 0
    ? Math.round((batch.healthy_birds / batch.total_birds) * 100)
    : 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🐔</span>
            <span className="text-sm font-semibold text-gray-900 capitalize">{batch.bird_type}</span>
            <Badge variant={STAGE_COLOR[batch.current_stage] || 'gray'} className="capitalize text-xs">
              {batch.current_stage}
            </Badge>
            {overdueTasks.length > 0 && (
              <Badge variant="red" className="text-xs flex items-center gap-1">
                <AlertTriangle size={10} /> {overdueTasks.length} overdue
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Arrived: {batch.arrival_date
              ? new Date(batch.arrival_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{(batch.total_birds || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400">birds</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Flock health</span>
          <span className={`text-xs font-semibold ${healthPct >= 90 ? 'text-green-600' : healthPct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
            {healthPct}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${healthPct >= 90 ? 'bg-green-500' : healthPct >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${healthPct}%` }}
          />
        </div>
        <div className="flex gap-3 mt-1.5 text-xs">
          <span className="text-green-600">{batch.healthy_birds || 0} healthy</span>
          {(batch.sick_birds || 0) > 0 && <span className="text-orange-500">{batch.sick_birds} sick</span>}
          {(batch.dead_birds || 0) > 0 && <span className="text-red-500">{batch.dead_birds} dead</span>}
        </div>
      </div>

      {(batch.vet_name || batch.assigned_vet_name) && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <Stethoscope size={13} className="text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs text-gray-500">Assigned vet: </span>
            <span className="text-xs font-medium text-gray-900">{batch.vet_name || batch.assigned_vet_name}</span>
          </div>
          {(batch.vet_phone || batch.assigned_vet_phone) && (
            <a href={`tel:${batch.vet_phone || batch.assigned_vet_phone}`}
              className="ml-auto text-xs text-green-700 hover:text-green-800 flex-shrink-0">
              <Phone size={12} />
            </a>
          )}
        </div>
      )}

      {batch.next_vet_visit && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={12} className="text-teal-600 flex-shrink-0" />
          <span>Next visit: </span>
          <span className={`font-medium ${new Date(batch.next_vet_visit) < new Date() ? 'text-red-500' : 'text-gray-800'}`}>
            {new Date(batch.next_vet_visit).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}

      {upcomingVaccinations.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Upcoming vaccinations</p>
          <div className="space-y-1">
            {upcomingVaccinations.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs rounded bg-gray-50 px-2.5 py-1.5 border border-gray-100">
                <span className="text-gray-800 flex items-center gap-1.5">💉 {t.name || t.description}</span>
                <span className={`flex-shrink-0 ml-2 ${new Date(t.scheduled_at) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                  {new Date(t.scheduled_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FarmerDetail({ farmer, onDispatch }) {
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setDetail(null);
    api.get(`/farmers/${farmer.id}`).then(r => setDetail(r.data)).catch(() => {});
  }, [farmer.id]);

  const batches = detail?.batches || [];
  const activeBatches = batches.filter(b => b.is_active !== false);
  const callHistory = detail?.call_history || [];
  const matchedVet = farmer.matched_vet_name;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{farmer.name}</h2>
            <p className="text-gray-500 flex items-center gap-1.5 text-sm">
              <Phone size={14} /> {farmer.phone}
              {farmer.alt_phone && <span className="text-gray-400 ml-1">· {farmer.alt_phone}</span>}
            </p>
            {farmer.district && (
              <p className="text-gray-500 flex items-center gap-1.5 text-sm mt-1">
                <MapPin size={14} />
                {[farmer.village, farmer.sub_county, farmer.district].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <Button size="sm" variant="danger" onClick={onDispatch} className="flex items-center gap-1.5 flex-shrink-0">
            🚑 Dispatch Vet
          </Button>
        </div>

        <OutreachPanel farmer={farmer} activeCall={null} />

        {matchedVet && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-3">
            <Stethoscope size={14} className="text-green-600" />
            <span className="text-xs text-gray-500">Assigned vet:</span>
            <span className="text-sm font-medium text-gray-900">{matchedVet}</span>
            <Badge variant={farmer.matched_vet_role === 'vet' ? 'blue' : 'green'} className="text-xs capitalize">
              {farmer.matched_vet_role || 'paravet'}
            </Badge>
          </div>
        )}

        {farmer.notes && (
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3 mt-3">{farmer.notes}</p>
        )}
      </div>

      {!detail && <div className="text-gray-400 text-sm text-center py-8">Loading…</div>}

      {detail && activeBatches.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-center text-gray-400 text-sm">
          No active batches. Farmer may be calling for the first time.
        </div>
      )}

      {activeBatches.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">
            Active Batches ({activeBatches.length})
          </h3>
          <div className="space-y-3">
            {activeBatches.map(batch => <BatchCard key={batch.id} batch={batch} />)}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Call History</h3>
          <span className="text-xs text-gray-400">{callHistory.length} call{callHistory.length !== 1 ? 's' : ''}</span>
        </div>

        {detail && callHistory.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <Phone size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">No calls recorded yet</p>
          </div>
        )}

        <div className="space-y-3">
          {callHistory.map((call, idx) => {
            const date = call.started_at ? new Date(call.started_at) : null;
            const dur  = call.duration_seconds ? `${Math.round(call.duration_seconds / 60)}m` : null;
            const symptoms = Array.isArray(call.symptoms) ? call.symptoms : [];
            const nextSteps = (call.next_steps || '').split('\n').map(l => l.trim()).filter(Boolean);

            const outcomeStyle = {
              resolved:      'text-green-700 border-green-200 bg-green-50',
              vet_requested: 'text-amber-700 border-amber-200 bg-amber-50',
              follow_up:     'text-teal-700  border-teal-200  bg-teal-50',
              no_action:     'text-gray-500  border-gray-200  bg-gray-50',
              transferred:   'text-blue-700  border-blue-200  bg-blue-50',
            }[call.outcome] || 'text-gray-500 border-gray-200 bg-gray-50';

            return (
              <div key={call.id} className={`rounded-xl border bg-white overflow-hidden ${
                call.is_emergency ? 'border-red-200' : 'border-gray-200'
              }`}>
                {call.is_emergency && <div className="h-0.5 bg-red-500 w-full" />}

                <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-300 w-5 flex-shrink-0">#{callHistory.length - idx}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">
                        {date ? date.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        {dur && <span className="ml-2 text-gray-400 font-normal">· {dur}</span>}
                      </p>
                      {call.agent_name && <p className="text-xs text-gray-400 mt-0.5">Agent: {call.agent_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {call.is_emergency && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600 animate-pulse">
                        EMERGENCY
                      </span>
                    )}
                    {call.outcome && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${outcomeStyle}`}>
                        {call.outcome.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {symptoms.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Symptoms Reported</p>
                      <div className="flex flex-wrap gap-1.5">
                        {symptoms.map((s, i) => {
                          const chip =
                            s.severity === 'severe' ? 'border-red-200 bg-red-50 text-red-600' :
                            s.severity === 'mild'   ? 'border-green-200 bg-green-50 text-green-700' :
                                                      'border-amber-200 bg-amber-50 text-amber-700';
                          return (
                            <span key={i} className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${chip}`}>
                              {s.symptom}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {call.agent_notes && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Agent Notes</p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        {call.agent_notes}
                      </p>
                    </div>
                  )}

                  {nextSteps.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Action Points</p>
                      <div className="space-y-1">
                        {nextSteps.map((step, i) => {
                          const done = step.startsWith('[x]');
                          const text = step.replace(/^\[[ x]\]\s*/, '');
                          return (
                            <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
                              done ? 'border-green-100 bg-green-50 text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-700'
                            }`}>
                              <span className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${
                                done ? 'bg-green-600 border-green-600' : 'border-gray-300'
                              }`}>
                                {done && <span className="text-white text-[9px] font-black">✓</span>}
                              </span>
                              <span className={done ? 'line-through' : ''}>{text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {call.call_intent && call.call_intent !== 'other' && (
                    <p className="text-xs text-gray-400 capitalize">
                      Intent: <span className="text-gray-600">{call.call_intent.replace(/_/g, ' ')}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FarmersList() {
  const { agent, logout } = useAuthStore();
  const { openDispatchModal } = useCallStore();
  const [farmers, setFarmers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      if (district) params.set('district', district);
      const { data } = await api.get(`/farmers?${params}`);
      setFarmers(data.farmers);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    api.get('/farmers/districts').then(r => setDistricts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, district]);

  function handleDispatch(farmer) {
    openDispatchModal({ urgency: 'scheduled', farmer });
  }

  const NAV = [
    { to: '/agent',         label: 'Dashboard' },
    { to: '/agent/farmers', label: 'Farmers',  active: true },
    { to: '/agent/vets',    label: 'Vets' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-20 flex-shrink-0 bg-white/90 border-b border-black/[0.07]" style={{ backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2">
          {selected && (
            <button onClick={() => setSelected(null)} className="md:hidden p-1.5 -ml-0.5 text-gray-500 hover:text-gray-900">
              <ArrowLeft size={18} />
            </button>
          )}
          <Logo size="sm" />
          <div className="h-6 w-px bg-gray-200 hidden sm:block" />
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {NAV.map(n => (
              <button key={n.to} onClick={() => navigate(n.to)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  n.active ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                {n.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="text-sm font-semibold text-gray-600 hidden sm:inline">{agent?.name}</span>
            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
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
              <span className="text-sm font-semibold text-gray-900">Farmers</span>
              <span className="text-xs text-gray-400">{total} total</span>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name or phone…"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600" />
            </div>
            <select value={district} onChange={e => setDistrict(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600">
              <option value="">All districts</option>
              {districts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading && <p className="text-gray-400 text-sm p-4 text-center">Loading…</p>}
            {!loading && farmers.length === 0 && (
              <p className="text-gray-400 text-sm p-4 text-center">No farmers found</p>
            )}
            {farmers.map(farmer => {
              const totalBirds = (farmer.batches || []).reduce((s, b) => s + (b.total_birds || 0), 0);
              return (
                <button key={farmer.id} onClick={() => setSelected(farmer)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selected?.id === farmer.id ? 'bg-green-50 border-l-2 border-l-green-600' : ''
                  }`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{farmer.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {farmer.phone}
                      </p>
                      {farmer.district && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {farmer.district}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {totalBirds > 0 && (
                        <span className="text-xs text-green-700 font-medium">{totalBirds.toLocaleString()} birds</span>
                      )}
                      {farmer.matched_vet_name && (
                        <span className="text-xs text-gray-400 truncate max-w-[80px]">{farmer.matched_vet_name}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <Users size={48} className="mb-3" />
              <p className="text-gray-500">Select a farmer to view their profile, batches and history</p>
            </div>
          ) : (
            <FarmerDetail key={selected.id} farmer={selected} onDispatch={() => handleDispatch(selected)} />
          )}
        </div>
      </div>

      {/* ── Mobile layout (<md): list → detail drill-down ── */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden mx-3 mb-3 mt-3 gap-3">
        {!selected ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-3 space-y-2 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Farmers</span>
                <span className="text-xs text-gray-400">{total} total</span>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name or phone…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600" />
              </div>
              <select value={district} onChange={e => setDistrict(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600">
                <option value="">All districts</option>
                {districts.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && <p className="text-gray-400 text-sm p-4 text-center">Loading…</p>}
              {!loading && farmers.length === 0 && (
                <p className="text-gray-400 text-sm p-4 text-center">No farmers found</p>
              )}
              {farmers.map(farmer => {
                const totalBirds = (farmer.batches || []).reduce((s, b) => s + (b.total_birds || 0), 0);
                return (
                  <button key={farmer.id} onClick={() => setSelected(farmer)}
                    className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{farmer.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {farmer.phone}
                        </p>
                        {farmer.district && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {farmer.district}
                          </p>
                        )}
                      </div>
                      {totalBirds > 0 && (
                        <span className="text-xs text-green-700 font-medium flex-shrink-0">{totalBirds.toLocaleString()} birds</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <FarmerDetail key={selected.id} farmer={selected} onDispatch={() => handleDispatch(selected)} />
          </div>
        )}
      </div>
      <VetDispatchModal />
    </div>
  );
}
