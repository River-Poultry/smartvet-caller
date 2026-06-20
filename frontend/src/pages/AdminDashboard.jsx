/**
 * AdminDashboard — FBI-style Dispatch Operations Centre
 * Left: escalation queue | Center: kanban board | Right: vet resources
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, Clock, Truck, Users, Stethoscope,
  ChevronUp, ChevronDown, RefreshCw, Package, LayoutGrid,
  ArrowUpCircle, Phone, LogOut, Shield, Activity, MapPin,
  UserPlus, X,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.jsx';
import { Badge } from '../components/shared/Badge.jsx';

// ─── Escalation config ────────────────────────────────────────────────────────

const LEVELS = {
  1: { label: 'L1 · Agent',     color: 'text-gray-400',  bg: 'bg-gray-800',   border: 'border-gray-600' },
  2: { label: 'L2 · Paravet',   color: 'text-blue-400',  bg: 'bg-blue-950',   border: 'border-blue-600' },
  3: { label: 'L3 · Vet',       color: 'text-amber-400', bg: 'bg-amber-950',  border: 'border-amber-600' },
  4: { label: 'L4 · Emergency', color: 'text-red-400',   bg: 'bg-red-950',    border: 'border-red-700', pulse: true },
};

const STATUS_COLS = [
  { id: 'pending',    label: 'Pending',   icon: Clock,         color: 'text-gray-400' },
  { id: 'assigned',  label: 'Assigned',  icon: Truck,         color: 'text-blue-400' },
  { id: 'completed', label: 'Resolved',  icon: CheckCircle,   color: 'text-green-400' },
  { id: 'cancelled', label: 'Cancelled', icon: X,             color: 'text-red-400' },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function EscalationBadge({ level = 1 }) {
  const cfg = LEVELS[level] || LEVELS[1];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded border ${cfg.color} ${cfg.border} ${cfg.pulse ? 'animate-pulse' : ''}`}>
      <Shield size={9} /> {cfg.label}
    </span>
  );
}

function ElapsedTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    function update() {
      const s = Math.floor((Date.now() - new Date(createdAt)) / 1000);
      if (s < 60)   setElapsed(`${s}s`);
      else if (s < 3600) setElapsed(`${Math.floor(s/60)}m ${s%60}s`);
      else setElapsed(`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`);
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  return <span className="font-mono text-xs text-gray-600">{elapsed}</span>;
}

// ─── Dispatch card ─────────────────────────────────────────────────────────────

function DispatchCard({ dispatch: d, vets, onEscalate, onAssign, onResolve, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [vetPick, setVetPick] = useState('');
  const isEmergency = d.urgency_level === 'emergency';

  return (
    <div className={`rounded-lg border text-xs mb-2 overflow-hidden ${
      isEmergency ? 'border-red-700 bg-red-950/15' : 'border-sv-border bg-sv-bg-card'
    }`}>
      {/* Header */}
      <div className="px-2.5 pt-2 pb-1.5">
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{d.farmer_name || 'Unknown Farmer'}</p>
            {d.farmer_phone && (
              <p className="text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={9}/>{d.farmer_phone}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${
              isEmergency ? 'bg-red-900/40 text-red-300 border border-red-700' : 'bg-blue-900/20 text-blue-300 border border-blue-800'
            }`}>{d.urgency_level}</span>
            <ElapsedTimer createdAt={d.created_at} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <EscalationBadge level={d.escalation_level || 1} />
          {d.assigned_paravet_name && (
            <span className="text-green-400 flex items-center gap-1"><Truck size={9}/>{d.assigned_paravet_name}</span>
          )}
        </div>

        {d.top_diagnosis && (
          <p className="mt-1 text-amber-400 truncate">Dx: {d.top_diagnosis}</p>
        )}

        <button onClick={() => setExpanded(e => !e)}
          className="mt-1 text-gray-700 hover:text-gray-400 flex items-center gap-0.5 transition-colors">
          {expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
          <span>{expanded ? 'less' : 'actions'}</span>
        </button>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-sv-border/40 space-y-2.5">

          {d.symptoms_description && (
            <div>
              <p className="text-gray-600 mb-0.5">Vet context</p>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-xs">{d.symptoms_description}</p>
            </div>
          )}

          {/* Assign vet */}
          <div>
            <p className="text-gray-600 mb-1">Assign / Reassign</p>
            <div className="flex gap-1">
              <select value={vetPick} onChange={e => setVetPick(e.target.value)}
                className="flex-1 bg-sv-bg-input border border-sv-border rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-sv-green">
                <option value="">Select vet…</option>
                {vets.filter(v => v.is_available).map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.role})</option>
                ))}
              </select>
              <button disabled={!vetPick}
                onClick={() => { onAssign(d.id, vetPick); setVetPick(''); }}
                className="px-2.5 py-1 bg-sv-green hover:bg-green-700 text-white rounded disabled:opacity-40 transition-colors text-xs">
                Assign
              </button>
            </div>
          </div>

          {/* Escalation */}
          <div>
            <p className="text-gray-600 mb-1">Escalation level</p>
            <div className="flex gap-1 flex-wrap">
              {[1,2,3,4].map(lvl => {
                const active = (d.escalation_level || 1) === lvl;
                const cfg = LEVELS[lvl];
                return (
                  <button key={lvl} disabled={active} onClick={() => onEscalate(d.id, lvl)}
                    className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                      active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-300'
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status actions */}
          <div className="flex gap-1.5">
            {d.status !== 'completed' && (
              <button onClick={() => onResolve(d.id)}
                className="flex-1 py-1.5 bg-green-900/20 text-green-400 border border-green-800 rounded hover:bg-green-900/40 transition-colors flex items-center justify-center gap-1">
                <CheckCircle size={11}/> Resolve
              </button>
            )}
            {d.status === 'pending' && (
              <button onClick={() => onCancel(d.id)}
                className="px-2.5 py-1.5 text-red-400 border border-red-900 rounded hover:bg-red-950/30 transition-colors">
                <X size={11}/>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vet resource card ─────────────────────────────────────────────────────────

function VetCard({ vet, inventory }) {
  const items = inventory.filter(i => String(i.vet_django_id) === String(vet.django_id));
  return (
    <div className={`rounded-lg border p-2.5 mb-2 text-xs ${vet.is_available ? 'border-sv-border' : 'border-gray-800 opacity-60'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate">{vet.name}</p>
          <p className="text-gray-500 capitalize truncate">{vet.role}{vet.district ? ` · ${vet.district}` : ''}</p>
        </div>
        <span className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
          vet.is_available ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-gray-800 text-gray-500 border border-gray-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${vet.is_available ? 'bg-green-400' : 'bg-gray-600'}`}/>
          {vet.is_available ? 'Available' : 'Busy'}
        </span>
      </div>
      {items.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-sv-border/30 pt-1.5">
          {items.slice(0,3).map((item, i) => (
            <div key={i} className="flex justify-between text-gray-600">
              <span className="truncate">{item.product_name}</span>
              <span className="ml-1 flex-shrink-0 text-gray-500">{parseFloat(item.quantity_in_stock || 0).toFixed(0)} {item.unit}</span>
            </div>
          ))}
          {items.length > 3 && <p className="text-gray-700">+{items.length-3} more</p>}
        </div>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { agent, logout } = useAuthStore();
  const navigate = useNavigate();

  const [dispatches, setDispatches] = useState([]);
  const [vets, setVets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  useWebSocket();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, vRes, iRes, aRes, mRes] = await Promise.all([
        api.get('/vet-dispatch?limit=200'),
        api.get('/vets?limit=100'),
        api.get('/inventory'),
        api.get('/agents'),
        api.get('/agents/metrics').catch(() => ({ data: null })),
      ]);
      setDispatches(dRes.data.dispatches || []);
      setVets(vRes.data.vets || []);
      setInventory(iRes.data || []);
      setAgents(aRes.data || []);
      setMetrics(mRes.data);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function escalate(id, level) {
    await api.patch(`/vet-dispatch/${id}/escalate`, { escalation_level: level }).catch(() => {});
    setDispatches(ds => ds.map(d => d.id === id ? { ...d, escalation_level: level } : d));
  }

  async function assign(dispatchId, vetId) {
    await api.post(`/vets/dispatch/${dispatchId}/assign`, { vet_id: vetId }).catch(() => {});
    const vet = vets.find(v => v.id === vetId);
    setDispatches(ds => ds.map(d => d.id === dispatchId ? {
      ...d, status: 'assigned', assigned_paravet_name: vet?.name,
    } : d));
  }

  async function resolve(id) {
    await api.patch(`/vet-dispatch/${id}/resolve`, {}).catch(() => {});
    setDispatches(ds => ds.map(d => d.id === id ? { ...d, status: 'completed' } : d));
  }

  async function cancel(id) {
    await api.patch(`/vet-dispatch/${id}/status`, { status: 'cancelled' }).catch(() => {});
    setDispatches(ds => ds.map(d => d.id === id ? { ...d, status: 'cancelled' } : d));
  }

  const filtered = urgencyFilter
    ? dispatches.filter(d => d.urgency_level === urgencyFilter)
    : dispatches;

  const byStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.id] = filtered.filter(d => d.status === col.id);
    return acc;
  }, {});

  const escalated = dispatches.filter(d => (d.escalation_level || 1) > 1 && d.status !== 'completed' && d.status !== 'cancelled');
  const l4 = escalated.filter(d => (d.escalation_level || 1) >= 4);
  const emergencyPending = dispatches.filter(d => d.urgency_level === 'emergency' && d.status === 'pending');
  const availableVets = vets.filter(v => v.is_available).length;

  return (
    <div className="min-h-screen bg-sv-bg flex flex-col text-white">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-sv-border bg-sv-bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SmartVet" className="h-8 w-auto" onError={e => { e.currentTarget.src = '/logo.svg'; }} />
          <div>
            <p className="text-sm font-extrabold text-white leading-none tracking-tight">Dispatch Operations Centre</p>
            <p className="text-xs text-sv-teal leading-none mt-0.5">{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live stat chips */}
          <div className="hidden md:flex items-center gap-3 text-xs">
            {emergencyPending.length > 0 && (
              <span className="flex items-center gap-1.5 bg-red-950/40 border border-red-700 px-2 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"/>
                <span className="text-red-300 font-bold">{emergencyPending.length}</span>
                <span className="text-red-400">emergency</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 text-gray-400">
              <Clock size={11} className="text-amber-400"/>
              <span className="text-amber-400 font-bold">{byStatus.pending?.length || 0}</span> pending
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <Stethoscope size={11} className="text-green-400"/>
              <span className="text-green-400 font-bold">{availableVets}</span>/{vets.length} vets
            </span>
          </div>

          <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
            className="bg-sv-bg-input border border-sv-border rounded px-2 py-1 text-xs text-white focus:outline-none">
            <option value="">All urgency</option>
            <option value="emergency">Emergency</option>
            <option value="scheduled">Scheduled</option>
          </select>

          <button onClick={load}
            className={`p-1.5 rounded border border-sv-border text-gray-400 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}>
            <RefreshCw size={13}/>
          </button>

          <Link to="/agent" className="text-xs text-gray-500 hover:text-sv-teal transition-colors border border-sv-border px-2.5 py-1.5 rounded">
            Agent View
          </Link>

          <ThemeToggle/>

          <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors p-1">
            <LogOut size={14}/>
          </button>
        </div>
      </header>

      {/* L4 alert banner */}
      {l4.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-950/50 border-b border-red-700 animate-pulse">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0"/>
          <span className="text-xs font-bold text-red-200">
            {l4.length} dispatch{l4.length !== 1 ? 'es' : ''} at L4 — Notify authorities immediately:
          </span>
          <span className="text-xs text-red-300">{l4.map(d => d.farmer_name || d.farmer_phone).join(' · ')}</span>
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — Escalation queue + agent board */}
        <div className="w-56 flex-shrink-0 border-r border-sv-border bg-sv-bg-card flex flex-col">
          <div className="px-3 py-2 border-b border-sv-border flex items-center gap-2 flex-shrink-0">
            <ArrowUpCircle size={12} className="text-amber-400"/>
            <span className="text-xs font-semibold">Escalation Queue</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {[4,3,2].map(lvl => {
              const items = escalated.filter(d => (d.escalation_level || 1) === lvl);
              if (!items.length) return null;
              const cfg = LEVELS[lvl];
              return (
                <div key={lvl} className="mb-3">
                  <p className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${cfg.color}`}>{cfg.label}</p>
                  {items.map(d => (
                    <div key={d.id} className={`rounded border ${cfg.border} ${cfg.bg} p-2 mb-1.5 text-xs space-y-0.5 ${cfg.pulse ? 'animate-pulse' : ''}`}>
                      <p className="text-white font-medium truncate">{d.farmer_name || d.farmer_phone || 'Unknown'}</p>
                      <div className="flex items-center justify-between">
                        <span className={`capitalize ${cfg.color}`}>{d.urgency_level}</span>
                        <ElapsedTimer createdAt={d.created_at}/>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {escalated.length === 0 && (
              <p className="text-xs text-gray-700 text-center pt-6">No active escalations</p>
            )}

            {/* Agent status mini-board */}
            {agents.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users size={10}/> Agents
                </p>
                {agents.map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 mb-1.5 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      a.status === 'on_call' ? 'bg-red-400 animate-pulse' :
                      a.status === 'online'  ? 'bg-green-400' :
                      a.status === 'on_break'? 'bg-amber-400' : 'bg-gray-600'
                    }`}/>
                    <span className="text-gray-400 truncate">{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — Kanban board */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-sv-border flex items-center gap-2 flex-shrink-0">
            <LayoutGrid size={12} className="text-sv-teal"/>
            <span className="text-xs font-semibold">Dispatch Board</span>
            <span className="text-xs text-gray-600 ml-1">{filtered.length} total</span>
            {metrics?.calls?.calls_today != null && (
              <span className="ml-auto text-xs text-gray-600 flex items-center gap-1">
                <Activity size={10}/> {metrics.calls.calls_today} calls today
              </span>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="flex h-full" style={{ minWidth: '600px' }}>
              {STATUS_COLS.map(col => {
                const Icon = col.icon;
                const cards = byStatus[col.id] || [];
                return (
                  <div key={col.id} className="flex-1 border-r border-sv-border/40 last:border-0 flex flex-col min-w-0">
                    <div className="px-2.5 py-2 border-b border-sv-border/40 flex items-center gap-1.5 bg-sv-bg/40 flex-shrink-0">
                      <Icon size={11} className={col.color}/>
                      <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                      <span className="ml-auto text-xs text-gray-700 bg-sv-bg px-1.5 py-0.5 rounded-full">{cards.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {cards.map(d => (
                        <DispatchCard
                          key={d.id}
                          dispatch={d}
                          vets={vets}
                          onEscalate={escalate}
                          onAssign={assign}
                          onResolve={resolve}
                          onCancel={cancel}
                        />
                      ))}
                      {cards.length === 0 && (
                        <p className="text-xs text-gray-700 text-center pt-8">Empty</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Vet availability + inventory */}
        <div className="w-52 flex-shrink-0 border-l border-sv-border bg-sv-bg-card flex flex-col">
          <div className="px-3 py-2 border-b border-sv-border flex items-center gap-2 flex-shrink-0">
            <Package size={12} className="text-sv-green"/>
            <span className="text-xs font-semibold">Vet Resources</span>
            <span className="ml-auto text-xs text-green-400">{availableVets}/{vets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {vets.map(vet => (
              <VetCard key={vet.id} vet={vet} inventory={inventory}/>
            ))}
            {vets.length === 0 && (
              <p className="text-xs text-gray-600 text-center pt-6">No vets loaded</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
