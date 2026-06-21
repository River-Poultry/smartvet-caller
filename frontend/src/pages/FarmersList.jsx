import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MapPin, Users, Stethoscope, Calendar, AlertTriangle } from 'lucide-react';
import api from '../services/api.js';
import { Badge } from '../components/shared/Badge.jsx';
import { Button } from '../components/shared/Button.jsx';
import { Logo } from '../components/shared/Logo.jsx';
import { ThemeToggle } from '../components/shared/ThemeToggle.jsx';
import { VetDispatchModal } from '../components/agent/VetDispatchModal.jsx';
import { OutreachPanel } from '../components/agent/OutreachPanel.jsx';
import { useAuthStore } from '../store/authStore.js';
import { useCallStore } from '../store/callStore.js';

const BIRD_TYPE_COLOR = { broiler: 'blue', layer: 'green', sasso: 'yellow', kuroiler: 'yellow', rainbow_rooster: 'yellow' };
const STAGE_COLOR = { brooding: 'blue', growing: 'green', finishing: 'yellow', laying: 'green' };
const TASK_TYPE_ICON = { vaccination: '💉', 'routine activity': '📋', treatment: '💊', inspection: '🔍', 'data collection': '📊' };

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
    <div className="rounded-xl border border-sv-border bg-sv-bg-card p-4 space-y-3">
      {/* Batch header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🐔</span>
            <span className="text-sm font-semibold text-white capitalize">{batch.bird_type}</span>
            <Badge variant={STAGE_COLOR[batch.current_stage] || 'gray'} className="capitalize text-xs">
              {batch.current_stage}
            </Badge>
            {overdueTasks.length > 0 && (
              <Badge variant="red" className="text-xs flex items-center gap-1">
                <AlertTriangle size={10} /> {overdueTasks.length} overdue
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Arrived: {batch.arrival_date ? new Date(batch.arrival_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{(batch.total_birds || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500">birds</p>
        </div>
      </div>

      {/* Health bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Flock health</span>
          <span className={`text-xs font-medium ${healthPct >= 90 ? 'text-green-400' : healthPct >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
            {healthPct}%
          </span>
        </div>
        <div className="h-1.5 bg-sv-bg-input rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${healthPct >= 90 ? 'bg-green-500' : healthPct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${healthPct}%` }}
          />
        </div>
        <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
          <span className="text-green-400">{batch.healthy_birds || 0} healthy</span>
          {(batch.sick_birds || 0) > 0 && <span className="text-orange-400">{batch.sick_birds} sick</span>}
          {(batch.dead_birds || 0) > 0 && <span className="text-red-400">{batch.dead_birds} dead</span>}
        </div>
      </div>

      {/* Assigned vet */}
      {(batch.vet_name || batch.assigned_vet_name) && (
        <div className="flex items-center gap-2 bg-sv-bg-input rounded-lg px-3 py-2">
          <Stethoscope size={13} className="text-sv-green flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs text-gray-400">Assigned vet: </span>
            <span className="text-xs font-medium text-white">{batch.vet_name || batch.assigned_vet_name}</span>
          </div>
          {(batch.vet_phone || batch.assigned_vet_phone) && (
            <a href={`tel:${batch.vet_phone || batch.assigned_vet_phone}`}
              className="ml-auto text-xs text-sv-green hover:text-sv-teal flex-shrink-0">
              <Phone size={12} />
            </a>
          )}
        </div>
      )}

      {/* Next vet visit */}
      {batch.next_vet_visit && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar size={12} className="text-sv-teal flex-shrink-0" />
          <span>Next visit: </span>
          <span className={`font-medium ${new Date(batch.next_vet_visit) < new Date() ? 'text-red-400' : 'text-white'}`}>
            {new Date(batch.next_vet_visit).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}

      {/* Upcoming vaccinations */}
      {upcomingVaccinations.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Upcoming vaccinations</p>
          <div className="space-y-1">
            {upcomingVaccinations.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs rounded bg-sv-bg-input px-2.5 py-1.5">
                <span className="text-white flex items-center gap-1.5">
                  💉 {t.name || t.description}
                </span>
                <span className={`text-gray-400 flex-shrink-0 ml-2 ${new Date(t.scheduled_at) < new Date() ? 'text-red-400' : ''}`}>
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
      {/* Header card */}
      <div className="bg-sv-bg-card border border-sv-border rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{farmer.name}</h2>
            <p className="text-gray-400 flex items-center gap-1.5 text-sm">
              <Phone size={14} /> {farmer.phone}
              {farmer.alt_phone && <span className="text-gray-600 ml-1">· {farmer.alt_phone}</span>}
            </p>
            {farmer.district && (
              <p className="text-gray-400 flex items-center gap-1.5 text-sm mt-1">
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

        {/* Assigned vet */}
        {matchedVet && (
          <div className="flex items-center gap-2 bg-sv-bg-input rounded-lg px-3 py-2 mb-3">
            <Stethoscope size={14} className="text-sv-green" />
            <span className="text-xs text-gray-400">Assigned vet:</span>
            <span className="text-sm font-medium text-white">{matchedVet}</span>
            <Badge variant={farmer.matched_vet_role === 'vet' ? 'blue' : 'green'} className="text-xs capitalize">
              {farmer.matched_vet_role || 'paravet'}
            </Badge>
          </div>
        )}

        {farmer.notes && (
          <p className="text-sm text-gray-400 bg-sv-bg-input rounded-lg p-3">{farmer.notes}</p>
        )}
      </div>

      {/* Batches */}
      {!detail && (
        <div className="text-sv-text-muted text-sm text-center py-8">Loading…</div>
      )}
      {detail && activeBatches.length === 0 && (
        <div className="bg-sv-bg-card border border-sv-border rounded-xl p-5 text-center text-gray-500 text-sm">
          No active batches. Farmer may be calling for the first time.
        </div>
      )}
      {activeBatches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
            Active Batches ({activeBatches.length})
          </h3>
          <div className="space-y-3">
            {activeBatches.map(batch => <BatchCard key={batch.id} batch={batch} />)}
          </div>
        </div>
      )}

      {/* Call history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Call History
          </h3>
          <span className="text-xs text-sv-text-muted">{callHistory.length} call{callHistory.length !== 1 ? 's' : ''}</span>
        </div>

        {!detail && (
          <div className="text-sv-text-muted text-sm text-center py-6">Loading…</div>
        )}

        {detail && callHistory.length === 0 && (
          <div className="bg-sv-bg-card border border-sv-border rounded-xl p-6 text-center">
            <Phone size={28} className="mx-auto mb-2 text-sv-text-muted opacity-30" />
            <p className="text-sm text-sv-text-muted">No calls recorded yet</p>
          </div>
        )}

        <div className="space-y-3">
          {callHistory.map((call, idx) => {
            const date = call.started_at ? new Date(call.started_at) : null;
            const dur  = call.duration_seconds ? `${Math.round(call.duration_seconds / 60)}m` : null;
            const symptoms = Array.isArray(call.symptoms) ? call.symptoms : [];
            const nextSteps = (call.next_steps || '')
              .split('\n')
              .map(l => l.trim())
              .filter(Boolean);
            const outcomeColor = {
              resolved:     'text-sv-green border-sv-green/40 bg-sv-green/10',
              vet_requested:'text-sv-amber border-sv-amber/40 bg-sv-amber/10',
              follow_up:    'text-sv-teal  border-sv-teal/40  bg-sv-teal/10',
              no_action:    'text-gray-400 border-gray-600    bg-gray-800/40',
              transferred:  'text-blue-400 border-blue-600    bg-blue-950/30',
            }[call.outcome] || 'text-sv-text-muted border-sv-border bg-sv-bg-input';

            return (
              <div key={call.id} className={`rounded-xl border bg-sv-bg-card overflow-hidden ${
                call.is_emergency ? 'border-sv-red/50' : 'border-sv-border'
              }`}>
                {call.is_emergency && <div className="h-0.5 bg-sv-red w-full" />}

                {/* Call header */}
                <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-sv-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-sv-text-muted w-5 flex-shrink-0">#{callHistory.length - idx}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {date ? date.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        {dur && <span className="ml-2 text-sv-text-muted font-normal">· {dur}</span>}
                      </p>
                      {call.agent_name && (
                        <p className="text-[11px] text-sv-text-muted mt-0.5">Agent: {call.agent_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {call.is_emergency && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-sv-red/50 bg-sv-red/10 text-sv-red animate-pulse">
                        EMERGENCY
                      </span>
                    )}
                    {call.outcome && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${outcomeColor}`}>
                        {call.outcome.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* Symptoms */}
                  {symptoms.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-sv-text-muted uppercase tracking-widest mb-1.5">Symptoms Reported</p>
                      <div className="flex flex-wrap gap-1.5">
                        {symptoms.map((s, i) => {
                          const chip =
                            s.severity === 'severe'   ? 'border-sv-red/40   bg-sv-red/10   text-sv-red' :
                            s.severity === 'mild'     ? 'border-sv-green/40 bg-sv-green/10 text-sv-green' :
                                                        'border-sv-amber/40 bg-sv-amber/10 text-sv-amber';
                          return (
                            <span key={i} className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${chip}`}>
                              {s.symptom}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Agent notes */}
                  {call.agent_notes && (
                    <div>
                      <p className="text-[10px] font-bold text-sv-text-muted uppercase tracking-widest mb-1">Agent Notes</p>
                      <p className="text-xs text-white/80 leading-relaxed bg-sv-bg-input rounded-lg px-3 py-2">
                        {call.agent_notes}
                      </p>
                    </div>
                  )}

                  {/* Next steps / action points */}
                  {nextSteps.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-sv-text-muted uppercase tracking-widest mb-1.5">Action Points</p>
                      <div className="space-y-1">
                        {nextSteps.map((step, i) => {
                          const done = step.startsWith('[x]');
                          const text = step.replace(/^\[[ x]\]\s*/, '');
                          return (
                            <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
                              done
                                ? 'border-sv-green/25 bg-sv-green/5 text-sv-text-muted'
                                : 'border-sv-border bg-sv-bg-input text-white/80'
                            }`}>
                              <span className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${
                                done ? 'bg-sv-green border-sv-green' : 'border-sv-text-muted/40'
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

                  {/* Intent tag */}
                  {call.call_intent && call.call_intent !== 'other' && (
                    <p className="text-[11px] text-sv-text-muted capitalize">
                      Intent: <span className="text-white/70">{call.call_intent.replace(/_/g, ' ')}</span>
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
    { to: '/agent', label: 'Dashboard' },
    { to: '/agent/farmers', label: 'Farmers', active: true },
    { to: '/agent/vets', label: 'Vets' },
  ];

  return (
    <div className="min-h-screen bg-sv-bg flex flex-col">
      {/* Header */}
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
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm text-gray-400">{agent?.name}</span>
          <button onClick={logout} className="text-gray-500 hover:text-white text-sm">Logout</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left — farmer list */}
        <div className="w-80 flex-shrink-0 border-r border-sv-border flex flex-col bg-sv-bg-card">
          {/* Search */}
          <div className="p-3 space-y-2 border-b border-sv-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">Farmers</span>
              <span className="text-xs text-gray-500">{total} total</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name or phone…"
                className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sv-green" />
            </div>
            <select value={district} onChange={e => setDistrict(e.target.value)}
              className="w-full bg-sv-bg-input border border-sv-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sv-green">
              <option value="">All districts</option>
              {districts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading && <p className="text-gray-600 text-sm p-4 text-center">Loading…</p>}
            {!loading && farmers.length === 0 && (
              <p className="text-gray-600 text-sm p-4 text-center">No farmers found</p>
            )}
            {farmers.map(farmer => {
              const totalBirds = (farmer.batches || []).reduce((s, b) => s + (b.total_birds || 0), 0);
              const hasActiveDispatch = false;
              return (
                <button key={farmer.id} onClick={() => setSelected(farmer)}
                  className={`w-full text-left px-4 py-3 border-b border-sv-border/50 hover:bg-sv-bg-input transition-colors ${
                    selected?.id === farmer.id ? 'bg-sv-bg-input border-l-2 border-l-sv-green' : ''
                  }`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{farmer.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {farmer.phone}
                      </p>
                      {farmer.district && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {farmer.district}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {totalBirds > 0 && (
                        <span className="text-xs text-sv-green font-medium">{totalBirds.toLocaleString()} birds</span>
                      )}
                      {farmer.matched_vet_name && (
                        <span className="text-xs text-gray-500 truncate max-w-[80px]">{farmer.matched_vet_name}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — detail */}
        <div className="flex-1 overflow-y-auto p-6 bg-sv-bg">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Users size={48} className="opacity-20 mb-3" />
              <p>Select a farmer to view their profile, batches and history</p>
            </div>
          ) : (
            <FarmerDetail key={selected.id} farmer={selected} onDispatch={() => handleDispatch(selected)} />
          )}
        </div>
      </div>
      <VetDispatchModal />
    </div>
  );
}
