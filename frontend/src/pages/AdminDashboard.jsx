import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, Clock, Truck, Users, Stethoscope,
  ChevronUp, ChevronDown, RefreshCw, Package, LayoutGrid,
  ArrowUpCircle, Phone, LogOut, Shield, Activity, X,
  PhoneCall, FileText, Warehouse, ChevronRight, Plus, Minus,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { ThemeToggle } from '../components/shared/ThemeToggle.jsx';
import UsersPanel from '../components/admin/UsersPanel.jsx';

// ─── shared helpers ───────────────────────────────────────────────────────────

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

const OUTCOME_COLORS = {
  resolved:      'bg-green-50 text-green-700 border-green-200',
  vet_requested: 'bg-blue-50 text-blue-700 border-blue-200',
  follow_up:     'bg-amber-50 text-amber-700 border-amber-200',
  no_action:     'bg-gray-100 text-gray-600 border-gray-200',
  transferred:   'bg-purple-50 text-purple-700 border-purple-200',
};

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

// ─── Dispatch tab ─────────────────────────────────────────────────────────────

function DispatchCard({ dispatch: d, vets, onEscalate, onAssign, onResolve, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [vetPick, setVetPick] = useState('');
  const isEmergency = d.urgency_level === 'emergency';

  return (
    <div className={`rounded-lg border text-xs mb-2 overflow-hidden bg-white ${isEmergency ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="px-2.5 pt-2 pb-1.5">
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{d.farmer_name || 'Unknown Farmer'}</p>
            {d.farmer_phone && <p className="text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={9}/>{d.farmer_phone}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${isEmergency ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
              {d.urgency_level}
            </span>
            <ElapsedTimer createdAt={d.created_at} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <EscalationBadge level={d.escalation_level || 1} />
          {d.assigned_paravet_name && <span className="text-green-700 flex items-center gap-1 text-xs"><Truck size={9}/>{d.assigned_paravet_name}</span>}
        </div>
        {d.top_diagnosis && <p className="mt-1 text-amber-600 truncate">Dx: {d.top_diagnosis}</p>}
        <button onClick={() => setExpanded(e => !e)} className="mt-1 text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors">
          {expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
          <span>{expanded ? 'less' : 'actions'}</span>
        </button>
      </div>

      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-gray-100 bg-gray-50 space-y-2.5">
          {d.symptoms_description && (
            <div>
              <p className="text-gray-400 mb-0.5">Vet context</p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{d.symptoms_description}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400 mb-1">Assign / Reassign</p>
            <div className="flex gap-1">
              <select value={vetPick} onChange={e => setVetPick(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-gray-900 text-xs focus:outline-none focus:border-green-600">
                <option value="">Select vet…</option>
                {vets.filter(v => v.is_available).map(v => <option key={v.id} value={v.id}>{v.name} ({v.role})</option>)}
              </select>
              <button disabled={!vetPick} onClick={() => { onAssign(d.id, vetPick); setVetPick(''); }}
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
                    className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${active ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'}`}>
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
        <span className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${vet.is_available ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
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
          {items.length > 3 && <p className="text-gray-400">+{items.length - 3} more</p>}
        </div>
      )}
    </div>
  );
}

function DispatchTab({ dispatches, vets, inventory, agents, metrics, urgencyFilter, setUrgencyFilter, loading, load, escalate, assign, resolve, cancel }) {
  const filtered = urgencyFilter ? dispatches.filter(d => d.urgency_level === urgencyFilter) : dispatches;
  const byStatus = STATUS_COLS.reduce((acc, col) => { acc[col.id] = filtered.filter(d => d.status === col.id); return acc; }, {});
  const escalated = dispatches.filter(d => (d.escalation_level || 1) > 1 && d.status !== 'completed' && d.status !== 'cancelled');
  const l4 = escalated.filter(d => (d.escalation_level || 1) >= 4);
  const availableVets = vets.filter(v => v.is_available).length;
  const emergencyPending = dispatches.filter(d => d.urgency_level === 'emergency' && d.status === 'pending');

  return (
    <>
      {l4.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border-b border-red-200 animate-pulse flex-shrink-0">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0"/>
          <span className="text-xs font-bold text-red-600">{l4.length} at L4 — Notify authorities:</span>
          <span className="text-xs text-red-500">{l4.map(d => d.farmer_name || d.farmer_phone).join(' · ')}</span>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <ArrowUpCircle size={12} className="text-amber-500"/>
            <span className="text-xs font-semibold text-gray-700">Escalation Queue</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
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
            {escalated.length === 0 && <p className="text-xs text-gray-400 text-center pt-6">No active escalations</p>}
            {agents.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Users size={10}/> Agents</p>
                {agents.map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 mb-1.5 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.status === 'on_call' ? 'bg-red-500 animate-pulse' : a.status === 'online' ? 'bg-green-500' : a.status === 'on_break' ? 'bg-amber-400' : 'bg-gray-300'}`}/>
                    <span className="text-gray-500 truncate">{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2 flex-shrink-0 bg-white">
            <LayoutGrid size={12} className="text-teal-600"/>
            <span className="text-xs font-semibold text-gray-700">Dispatch Board</span>
            <span className="text-xs text-gray-400 ml-1">{filtered.length} total</span>
            <div className="ml-auto flex items-center gap-2">
              {emergencyPending.length > 0 && (
                <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"/>
                  <span className="text-red-600 font-bold">{emergencyPending.length} emergency</span>
                </span>
              )}
              <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none">
                <option value="">All urgency</option>
                <option value="emergency">Emergency</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto bg-gray-50">
            <div className="flex h-full" style={{ minWidth: '600px' }}>
              {STATUS_COLS.map(col => {
                const Icon = col.icon;
                const cards = byStatus[col.id] || [];
                return (
                  <div key={col.id} className="flex-1 border-r border-gray-200 last:border-0 flex flex-col min-w-0">
                    <div className="px-3 py-2.5 border-b border-gray-200 flex items-center gap-1.5 bg-white flex-shrink-0">
                      <Icon size={11} className={col.color}/>
                      <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{cards.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                      {cards.map(d => <DispatchCard key={d.id} dispatch={d} vets={vets} onEscalate={escalate} onAssign={assign} onResolve={resolve} onCancel={cancel}/>)}
                      {cards.length === 0 && <p className="text-xs text-gray-300 text-center pt-8">Empty</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="w-52 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <Stethoscope size={12} className="text-green-700"/>
            <span className="text-xs font-semibold text-gray-700">Vet Resources</span>
            <span className="ml-auto text-xs text-green-700 font-semibold">{availableVets}/{vets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {vets.map(vet => <VetCard key={vet.id} vet={vet} inventory={inventory}/>)}
            {vets.length === 0 && <p className="text-xs text-gray-400 text-center pt-6">No vets loaded</p>}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Calls tab ────────────────────────────────────────────────────────────────

function CallsTab() {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState('');
  const [emergency, setEmergency] = useState('');
  const LIMIT = 30;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (outcome) params.set('outcome', outcome);
      if (emergency) params.set('emergency', emergency);
      const { data } = await api.get(`/calls?${params}`);
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, outcome, emergency]);

  function fmt(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  }

  function duration(start, end) {
    if (!start || !end) return '—';
    const s = Math.floor((new Date(end) - new Date(start)) / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
        <PhoneCall size={13} className="text-teal-600"/>
        <span className="text-xs font-semibold text-gray-700">Call History</span>
        <span className="text-xs text-gray-400">{total} total</span>
        <div className="ml-auto flex items-center gap-2">
          <select value={outcome} onChange={e => { setOutcome(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none">
            <option value="">All outcomes</option>
            <option value="resolved">Resolved</option>
            <option value="vet_requested">Vet arranged</option>
            <option value="follow_up">Follow-up</option>
            <option value="no_action">No action</option>
            <option value="transferred">Transferred</option>
          </select>
          <select value={emergency} onChange={e => { setEmergency(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none">
            <option value="">All calls</option>
            <option value="true">Emergency only</option>
          </select>
          <button onClick={load} className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        {loading && <p className="text-gray-400 text-xs text-center p-8">Loading…</p>}
        {!loading && calls.length === 0 && <p className="text-gray-400 text-xs text-center p-8">No calls found</p>}
        {!loading && calls.length > 0 && (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 sticky top-0">
                {['Farmer', 'Agent', 'Started', 'Duration', 'Outcome', 'Dispatches', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((c, i) => (
                <tr key={c.id} className={`border-b border-gray-100 hover:bg-white transition-colors ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {c.is_emergency && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"/>}
                      <div>
                        <p className="font-medium text-gray-900">{c.farmer_name || '—'}</p>
                        <p className="text-gray-400">{c.phone_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{c.agent_name || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(c.started_at)}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono whitespace-nowrap">{duration(c.started_at, c.ended_at)}</td>
                  <td className="px-3 py-2">
                    {c.outcome
                      ? <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize ${OUTCOME_COLORS[c.outcome] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{c.outcome.replace('_', ' ')}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-center">
                    {parseInt(c.dispatch_count) > 0
                      ? <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">{c.dispatch_count}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-3 py-2">
                    {c.agent_notes && (
                      <div className="max-w-xs">
                        <p className="text-gray-500 truncate">{c.agent_notes}</p>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white flex-shrink-0">
          <span className="text-xs text-gray-500">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50 transition-colors">← Prev</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory tab ────────────────────────────────────────────────────────────

function InventoryTab({ vets }) {
  const [warehouse, setWarehouse] = useState([]);
  const [allocs, setAllocs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState('stock'); // 'stock' | 'history'
  const [adjusting, setAdjusting] = useState({}); // itemId → { delta: '' }
  const [allocating, setAllocating] = useState(null); // item
  const [allocForm, setAllocForm]   = useState({ vet: '', qty: '' });
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');

  async function load() {
    setLoading(true);
    try {
      const [wRes, aRes] = await Promise.all([
        api.get('/inventory/warehouse'),
        api.get('/inventory/warehouse/allocations'),
      ]);
      setWarehouse(wRes.data || []);
      setAllocs(aRes.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setStock(id, quantity) {
    setSaving(true);
    try {
      const { data } = await api.patch(`/inventory/warehouse/${id}/stock`, { quantity: parseFloat(quantity) });
      setWarehouse(w => w.map(i => i.id === id ? data : i));
      setAdjusting(a => { const n = {...a}; delete n[id]; return n; });
      flash('Stock updated');
    } catch (e) { flash('Failed: ' + (e.response?.data?.error || e.message), true); }
    setSaving(false);
  }

  async function allocate() {
    if (!allocating || !allocForm.vet || !allocForm.qty) return;
    setSaving(true);
    const vet = vets.find(v => v.id === allocForm.vet);
    try {
      await api.post('/inventory/warehouse/allocate', {
        product_name: allocating.product_name,
        vet_django_id: vet?.django_id || allocForm.vet,
        vet_name: vet?.name || 'Unknown',
        quantity_allocated: parseFloat(allocForm.qty),
      });
      await load();
      setAllocating(null);
      setAllocForm({ vet: '', qty: '' });
      flash(`Allocated ${allocForm.qty} ${allocating.unit} to ${vet?.name}`);
    } catch (e) { flash('Failed: ' + (e.response?.data?.error || e.message), true); }
    setSaving(false);
  }

  function flash(text, err = false) {
    setMsg({ text, err });
    setTimeout(() => setMsg(''), 3000);
  }

  const catColor = { vaccine: 'text-teal-600', antibiotic: 'text-amber-600', antiparasitic: 'text-purple-600', vitamin: 'text-green-700' };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
        <Warehouse size={13} className="text-green-700"/>
        <span className="text-xs font-semibold text-gray-700">Warehouse Inventory</span>
        <span className="text-xs text-gray-400">{warehouse.length} items</span>

        <div className="flex ml-4 border border-gray-200 rounded-lg overflow-hidden">
          {[['stock', 'Stock Levels'], ['history', 'Allocation History']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${view === v ? 'bg-green-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {msg && <span className={`text-xs px-2 py-1 rounded border ${msg.err ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{msg.text}</span>}
          <button onClick={load} className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        {loading && <p className="text-gray-400 text-xs text-center p-8">Loading…</p>}

        {!loading && view === 'stock' && (
          <>
            {warehouse.length === 0 && <p className="text-gray-400 text-xs text-center p-8">No warehouse items. Add stock via SmartVet Core.</p>}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {warehouse.map(item => {
                const adj = adjusting[item.id];
                const low = parseFloat(item.quantity) < parseFloat(item.min_stock || 0);
                return (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{item.product_name}</p>
                        <p className={`text-xs font-medium mt-0.5 ${catColor[item.category] || 'text-gray-500'}`}>{item.category}</p>
                      </div>
                      {low && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">LOW</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Warehouse</p>
                        <p className="text-sm font-bold text-gray-900">{parseFloat(item.quantity || 0).toFixed(0)} <span className="text-xs font-normal text-gray-400">{item.unit}</span></p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">In field</p>
                        <p className="text-sm font-bold text-gray-900">{parseFloat(item.allocated_to_vets || 0).toFixed(0)} <span className="text-xs font-normal text-gray-400">{item.unit}</span></p>
                      </div>
                    </div>

                    {adj ? (
                      <div className="flex gap-1.5 items-center">
                        <input type="number" value={adj.val} onChange={e => setAdjusting(a => ({...a, [item.id]: { val: e.target.value }}))}
                          className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-green-600"
                          placeholder="New qty" autoFocus />
                        <button onClick={() => setStock(item.id, adj.val)} disabled={saving || !adj.val}
                          className="px-2 py-1 bg-green-700 text-white rounded text-xs disabled:opacity-40 hover:bg-green-800 transition-colors">
                          {saving ? '…' : 'Set'}
                        </button>
                        <button onClick={() => setAdjusting(a => { const n={...a}; delete n[item.id]; return n; })}
                          className="p-1 text-gray-400 hover:text-gray-700">
                          <X size={12}/>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setAdjusting(a => ({...a, [item.id]: { val: String(parseFloat(item.quantity || 0).toFixed(0)) }}))}
                          className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-green-300 hover:text-green-700 transition-colors flex items-center justify-center gap-1">
                          <FileText size={10}/> Update stock
                        </button>
                        <button onClick={() => { setAllocating(item); setAllocForm({ vet: '', qty: '' }); }}
                          className="flex-1 py-1.5 text-xs border border-green-200 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center gap-1">
                          <ChevronRight size={10}/> Allocate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!loading && view === 'history' && (
          <div className="p-4">
            {allocs.length === 0 && <p className="text-gray-400 text-xs text-center p-4">No allocations yet</p>}
            {allocs.length > 0 && (
              <table className="w-full text-xs border-collapse bg-white rounded-xl overflow-hidden border border-gray-200">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Product', 'Vet', 'Qty', 'Allocated by', 'When', 'Notes'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allocs.map((a, i) => (
                    <tr key={a.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2 font-medium text-gray-900">{a.product_name}</td>
                      <td className="px-3 py-2 text-gray-600">{a.vet_name}</td>
                      <td className="px-3 py-2 font-mono text-gray-900">{parseFloat(a.quantity_allocated).toFixed(0)}</td>
                      <td className="px-3 py-2 text-gray-500">{a.allocated_by}</td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{new Date(a.allocated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-3 py-2 text-gray-400">{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Allocate modal */}
      {allocating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Allocate to Vet</h3>
              <button onClick={() => setAllocating(null)} className="text-gray-400 hover:text-gray-700"><X size={16}/></button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-green-700 font-medium">{allocating.product_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Available: <span className="font-bold text-gray-900">{parseFloat(allocating.quantity || 0).toFixed(0)} {allocating.unit}</span></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Select Vet / Paravet *</label>
                <select value={allocForm.vet} onChange={e => setAllocForm(f => ({...f, vet: e.target.value}))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600">
                  <option value="">Choose…</option>
                  {vets.filter(v => v.is_available).map(v => <option key={v.id} value={v.id}>{v.name} ({v.role})</option>)}
                  {vets.filter(v => !v.is_available).map(v => <option key={v.id} value={v.id}>{v.name} (busy)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Quantity ({allocating.unit}) *</label>
                <input type="number" value={allocForm.qty} onChange={e => setAllocForm(f => ({...f, qty: e.target.value}))}
                  max={parseFloat(allocating.quantity || 0)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600"
                  placeholder="0" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setAllocating(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={allocate} disabled={saving || !allocForm.vet || !allocForm.qty}
                className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
                {saving ? 'Allocating…' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { agent, logout } = useAuthStore();
  const [tab, setTab] = useState('dispatch');

  const [dispatches, setDispatches] = useState([]);
  const [vets, setVets]             = useState([]);
  const [inventory, setInventory]   = useState([]);
  const [agents, setAgents]         = useState([]);
  const [metrics, setMetrics]       = useState(null);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [usersOpen, setUsersOpen]   = useState(false);

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
    setDispatches(ds => ds.map(d => d.id === dispatchId ? { ...d, status: 'assigned', assigned_paravet_name: vet?.name } : d));
  }
  async function resolve(id) {
    await api.patch(`/vet-dispatch/${id}/resolve`, {}).catch(() => {});
    setDispatches(ds => ds.map(d => d.id === id ? { ...d, status: 'completed' } : d));
  }
  async function cancel(id) {
    await api.patch(`/vet-dispatch/${id}/status`, { status: 'cancelled' }).catch(() => {});
    setDispatches(ds => ds.map(d => d.id === id ? { ...d, status: 'cancelled' } : d));
  }

  const TABS = [
    { id: 'dispatch',  label: 'Dispatch',  icon: Truck,      count: dispatches.filter(d => d.status === 'pending').length },
    { id: 'calls',     label: 'Calls',     icon: PhoneCall },
    { id: 'inventory', label: 'Inventory', icon: Warehouse },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="SmartVet" className="h-8 w-auto" onError={e => { e.currentTarget.src = '/logo.svg'; }} />
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none tracking-tight">Operations Centre</p>
            <p className="text-xs text-teal-600 leading-none mt-0.5">{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}</p>
          </div>

          {/* Tab nav */}
          <div className="flex ml-2 border border-gray-200 rounded-lg overflow-hidden">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t.id ? 'bg-green-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
                  <Icon size={11}/> {t.label}
                  {t.count > 0 && <span className={`text-[10px] font-bold px-1.5 rounded-full ${tab === t.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>{t.count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Clock size={11} className="text-amber-500"/> <span className="text-amber-600 font-bold">{dispatches.filter(d => d.status === 'pending').length}</span> pending</span>
            <span className="flex items-center gap-1"><Stethoscope size={11} className="text-green-600"/> <span className="text-green-700 font-bold">{vets.filter(v => v.is_available).length}</span>/{vets.length} vets</span>
            {metrics?.calls?.calls_today != null && <span className="flex items-center gap-1"><Activity size={11}/> {metrics.calls.calls_today} calls today</span>}
          </div>

          <button onClick={load}
            className={`p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors ${loading ? 'animate-spin' : ''}`}>
            <RefreshCw size={13}/>
          </button>

          <button onClick={() => setUsersOpen(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-600 border border-gray-200 px-2.5 py-1.5 rounded hover:border-gray-300 transition-colors">
            <Users size={12}/> Users
          </button>

          <Link to="/agent" className="text-xs text-gray-500 hover:text-teal-600 border border-gray-200 px-2.5 py-1.5 rounded hover:border-gray-300 transition-colors">
            Agent View
          </Link>

          <ThemeToggle/>

          <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1">
            <LogOut size={14}/>
          </button>
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 flex flex-col overflow-hidden mx-5 mb-5 mt-4 rounded-xl border border-gray-200 shadow-sm bg-white">
        {tab === 'dispatch' && (
          <DispatchTab
            dispatches={dispatches} vets={vets} inventory={inventory}
            agents={agents} metrics={metrics}
            urgencyFilter={urgencyFilter} setUrgencyFilter={setUrgencyFilter}
            loading={loading} load={load}
            escalate={escalate} assign={assign} resolve={resolve} cancel={cancel}
          />
        )}
        {tab === 'calls' && <CallsTab />}
        {tab === 'inventory' && <InventoryTab vets={vets} />}
      </div>

      {usersOpen && <UsersPanel onClose={() => setUsersOpen(false)} />}
    </div>
  );
}
