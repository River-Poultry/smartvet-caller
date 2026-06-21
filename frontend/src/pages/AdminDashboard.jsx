import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, Clock, Truck, Users, Stethoscope,
  ChevronUp, ChevronDown, RefreshCw, Package, LayoutGrid,
  ArrowUpCircle, Phone, LogOut, Shield, Activity,
  UserPlus, X,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.jsx';
import UsersPanel from '../components/admin/UsersPanel.jsx';

const LEVELS = {
  1: { label: 'L1 · Agent',     color: 'text-gray-500',  bg: 'bg-gray-100',   border: 'border-gray-300' },
  2: { label: 'L2 · Paravet',   color: 'text-blue-600',  bg: 'bg-blue-50',    border: 'border-blue-300' },
  3: { label: 'L3 · Vet',       color: 'text-amber-600', bg: 'bg-amber-50',   border: 'border-amber-300' },
  4: { label: 'L4 · Emergency', color: 'text-red-600',   bg: 'bg-red-50',     border: 'border-red-400', pulse: true },
};

const STATUS_COLS = [
  { id: 'pending',    label: 'Pending',   icon: Clock,       color: 'text-gray-500' },
  { id: 'assigned',  label: 'Assigned',  icon: Truck,       color: 'text-blue-600' },
  { id: 'completed', label: 'Resolved',  icon: CheckCircle, color: 'text-green-700' },
  { id: 'cancelled', label: 'Cancelled', icon: X,           color: 'text-red-500' },
];

function EscalationBadge({ level = 1 }) {
  const cfg = LEVELS[level] || LEVELS[1];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded border ${cfg.color} ${cfg.border} ${cfg.bg} ${cfg.pulse ? 'animate-pulse' : ''}`}>
      <Shield size={9} /> {cfg.label}
    </span>
  );
}

function ElapsedTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    function update() {
      const s = Math.floor((Date.now() - new Date(createdAt)) / 1000);
      if (s < 60)        setElapsed(`${s}s`);
      else if (s < 3600) setElapsed(`${Math.floor(s/60)}m ${s%60}s`);
      else               setElapsed(`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`);
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  return <span className="font-mono text-xs text-gray-400">{elapsed}</span>;
}

function DispatchCard({ dispatch: d, vets, onEscalate, onAssign, onResolve, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [vetPick, setVetPick] = useState('');
  const isEmergency = d.urgency_level === 'emergency';

  return (
    <div className={`rounded-lg border text-xs mb-2 overflow-hidden bg-white ${
      isEmergency ? 'border-red-300' : 'border-gray-200'
    }`}>
      <div className="px-2.5 pt-2 pb-1.5">
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{d.farmer_name || 'Unknown Farmer'}</p>
            {d.farmer_phone && (
              <p className="text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={9}/>{d.farmer_phone}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${
              isEmergency ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>{d.urgency_level}</span>
            <ElapsedTimer createdAt={d.created_at} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <EscalationBadge level={d.escalation_level || 1} />
          {d.assigned_paravet_name && (
            <span className="text-green-700 flex items-center gap-1 text-xs"><Truck size={9}/>{d.assigned_paravet_name}</span>
          )}
        </div>

        {d.top_diagnosis && (
          <p className="mt-1 text-amber-600 truncate">Dx: {d.top_diagnosis}</p>
        )}

        <button onClick={() => setExpanded(e => !e)}
          className="mt-1 text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors">
          {expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
          <span>{expanded ? 'less' : 'actions'}</span>
        </button>
      </div>

      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-gray-100 bg-gray-50 space-y-2.5">
          {d.symptoms_description && (
            <div>
              <p className="text-gray-400 mb-0.5">Vet context</p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs">{d.symptoms_description}</p>
            </div>
          )}

          <div>
            <p className="text-gray-400 mb-1">Assign / Reassign</p>
            <div className="flex gap-1">
              <select value={vetPick} onChange={e => setVetPick(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-xs focus:outline-none focus:border-green-600">
                <option value="">Select vet…</option>
                {vets.filter(v => v.is_available).map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.role})</option>
                ))}
              </select>
              <button disabled={!vetPick}
                onClick={() => { onAssign(d.id, vetPick); setVetPick(''); }}
                className="px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-40 transition-colors text-xs">
                Assign
              </button>
            </div>
          </div>

          <div>
            <p className="text-gray-400 mb-1">Escalation level</p>
            <div className="flex gap-1 flex-wrap">
              {[1,2,3,4].map(lvl => {
                const active = (d.escalation_level || 1) === lvl;
                const cfg = LEVELS[lvl];
                return (
                  <button key={lvl} disabled={active} onClick={() => onEscalate(d.id, lvl)}
                    className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                      active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1.5">
            {d.status !== 'completed' && (
              <button onClick={() => onResolve(d.id)}
                className="flex-1 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors flex items-center justify-center gap-1">
                <CheckCircle size={11}/> Resolve
              </button>
            )}
            {d.status === 'pending' && (
              <button onClick={() => onCancel(d.id)}
                className="px-2.5 py-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors">
                <X size={11}/>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VetCard({ vet, inventory }) {
  const items = inventory.filter(i => String(i.vet_django_id) === String(vet.django_id));
  return (
    <div className={`rounded-lg border p-2.5 mb-2 text-xs bg-white ${vet.is_available ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{vet.name}</p>
          <p className="text-gray-400 capitalize truncate">{vet.role}{vet.district ? ` · ${vet.district}` : ''}</p>
        </div>
        <span className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
          vet.is_available ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${vet.is_available ? 'bg-green-500' : 'bg-gray-400'}`}/>
          {vet.is_available ? 'Available' : 'Busy'}
        </span>
      </div>
      {items.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-gray-100 pt-1.5">
          {items.slice(0,3).map((item, i) => (
            <div key={i} className="flex justify-between text-gray-500">
              <span className="truncate">{item.product_name}</span>
              <span className="ml-1 flex-shrink-0 text-gray-400">{parseFloat(item.quantity_in_stock || 0).toFixed(0)} {item.unit}</span>
            </div>
          ))}
          {items.length > 3 && <p className="text-gray-400">+{items.length-3} more</p>}
        </div>
      )}
    </div>
  );
}

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
  const [usersOpen, setUsersOpen] = useState(false);

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
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SmartVet" className="h-8 w-auto" onError={e => { e.currentTarget.src = '/logo.svg'; }} />
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none tracking-tight">Dispatch Operations Centre</p>
            <p className="text-xs text-teal-600 leading-none mt-0.5">{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs">
            {emergencyPending.length > 0 && (
              <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"/>
                <span className="text-red-600 font-bold">{emergencyPending.length}</span>
                <span className="text-red-500">emergency</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 text-gray-500">
              <Clock size={11} className="text-amber-500"/>
              <span className="text-amber-600 font-bold">{byStatus.pending?.length || 0}</span> pending
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <Stethoscope size={11} className="text-green-600"/>
              <span className="text-green-700 font-bold">{availableVets}</span>/{vets.length} vets
            </span>
          </div>

          <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-green-600">
            <option value="">All urgency</option>
            <option value="emergency">Emergency</option>
            <option value="scheduled">Scheduled</option>
          </select>

          <button onClick={load}
            className={`p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors ${loading ? 'animate-spin' : ''}`}>
            <RefreshCw size={13}/>
          </button>

          <button onClick={() => setUsersOpen(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-600 transition-colors border border-gray-200 px-2.5 py-1.5 rounded hover:border-gray-300">
            <Users size={12}/> Users
          </button>

          <Link to="/agent" className="text-xs text-gray-500 hover:text-teal-600 transition-colors border border-gray-200 px-2.5 py-1.5 rounded hover:border-gray-300">
            Agent View
          </Link>

          <ThemeToggle/>

          <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1">
            <LogOut size={14}/>
          </button>
        </div>
      </header>

      {/* L4 alert banner */}
      {l4.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border-b border-red-200 animate-pulse">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0"/>
          <span className="text-xs font-bold text-red-600">
            {l4.length} dispatch{l4.length !== 1 ? 'es' : ''} at L4 — Notify authorities immediately:
          </span>
          <span className="text-xs text-red-500">{l4.map(d => d.farmer_name || d.farmer_phone).join(' · ')}</span>
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — Escalation queue + agent board */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <ArrowUpCircle size={12} className="text-amber-500"/>
            <span className="text-xs font-semibold text-gray-700">Escalation Queue</span>
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
                      <p className="text-gray-900 font-medium truncate">{d.farmer_name || d.farmer_phone || 'Unknown'}</p>
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
              <p className="text-xs text-gray-400 text-center pt-6">No active escalations</p>
            )}

            {agents.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users size={10}/> Agents
                </p>
                {agents.map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 mb-1.5 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      a.status === 'on_call'  ? 'bg-red-500 animate-pulse' :
                      a.status === 'online'   ? 'bg-green-500' :
                      a.status === 'on_break' ? 'bg-amber-400' : 'bg-gray-300'
                    }`}/>
                    <span className="text-gray-500 truncate">{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — Kanban board */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2 flex-shrink-0 bg-white">
            <LayoutGrid size={12} className="text-teal-600"/>
            <span className="text-xs font-semibold text-gray-700">Dispatch Board</span>
            <span className="text-xs text-gray-400 ml-1">{filtered.length} total</span>
            {metrics?.calls?.calls_today != null && (
              <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                <Activity size={10}/> {metrics.calls.calls_today} calls today
              </span>
            )}
          </div>

          <div className="flex-1 overflow-x-auto bg-gray-50">
            <div className="flex h-full" style={{ minWidth: '600px' }}>
              {STATUS_COLS.map(col => {
                const Icon = col.icon;
                const cards = byStatus[col.id] || [];
                return (
                  <div key={col.id} className="flex-1 border-r border-gray-200 last:border-0 flex flex-col min-w-0">
                    <div className="px-2.5 py-2 border-b border-gray-200 flex items-center gap-1.5 bg-white flex-shrink-0">
                      <Icon size={11} className={col.color}/>
                      <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{cards.length}</span>
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
                        <p className="text-xs text-gray-300 text-center pt-8">Empty</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Vet availability + inventory */}
        <div className="w-52 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <Package size={12} className="text-green-700"/>
            <span className="text-xs font-semibold text-gray-700">Vet Resources</span>
            <span className="ml-auto text-xs text-green-700 font-semibold">{availableVets}/{vets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {vets.map(vet => (
              <VetCard key={vet.id} vet={vet} inventory={inventory}/>
            ))}
            {vets.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-6">No vets loaded</p>
            )}
          </div>
        </div>

      </div>

      {usersOpen && <UsersPanel onClose={() => setUsersOpen(false)} />}
    </div>
  );
}
