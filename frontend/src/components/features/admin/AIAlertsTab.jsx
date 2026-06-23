import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Download, RefreshCw, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import api from '../../../services/api.js';

const TRIGGER_LABELS = {
  accuracy_drop:    { label: 'Accuracy Drop',    color: 'text-red-600    bg-red-50    border-red-200'    },
  rejection_spike:  { label: 'Rejection Spike',  color: 'text-amber-600  bg-amber-50  border-amber-200'  },
  unknown_disease:  { label: 'Unknown Disease',  color: 'text-purple-600 bg-purple-50 border-purple-200' },
};

const STATUS_COLORS = {
  open:         'text-red-600    bg-red-50    border-red-200',
  acknowledged: 'text-amber-600  bg-amber-50  border-amber-200',
  resolved:     'text-green-700  bg-green-50  border-green-200',
};

function AlertRow({ alert, onUpdate }) {
  const [expanded, setExpanded]   = useState(false);
  const [notes, setNotes]         = useState(alert.developer_notes || '');
  const [saving, setSaving]       = useState(false);

  const trigger = TRIGGER_LABELS[alert.trigger_type] || { label: alert.trigger_type, color: 'text-gray-600 bg-gray-50 border-gray-200' };

  async function updateStatus(status) {
    setSaving(true);
    try {
      const { data } = await api.patch(`/insights/alerts/${alert.id}`, { status, developer_notes: notes || undefined });
      onUpdate(data.alert);
    } catch {}
    setSaving(false);
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${alert.status === 'resolved' ? 'opacity-60' : ''}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${trigger.color}`}>
          {trigger.label}
        </span>
        <span className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">{alert.disease_name}</span>

        {alert.accuracy_pct != null && (
          <span className={`text-xs font-bold flex-shrink-0 ${alert.accuracy_pct < 50 ? 'text-red-600' : 'text-amber-600'}`}>
            {alert.accuracy_pct}% accurate
          </span>
        )}
        {alert.rejection_count != null && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {alert.rejection_count} rejection{alert.rejection_count !== 1 ? 's' : ''}
            {alert.review_count ? ` / ${alert.review_count} reviews` : ''}
          </span>
        )}

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 capitalize ${STATUS_COLORS[alert.status]}`}>
          {alert.status}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
          {new Date(alert.created_at).toLocaleDateString()}
        </span>
        {expanded ? <ChevronUp size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">
          {/* Context */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Trigger type</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{alert.trigger_type.replace('_', ' ')}</p>
            </div>
            {alert.accuracy_pct != null && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Accuracy (30d)</p>
                <p className={`text-sm font-bold ${alert.accuracy_pct < 50 ? 'text-red-600' : 'text-amber-600'}`}>{alert.accuracy_pct}%</p>
              </div>
            )}
            {alert.rejection_count != null && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Rejections</p>
                <p className="text-sm font-bold text-gray-800">{alert.rejection_count} / {alert.review_count || '?'} reviews</p>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Window</p>
              <p className="text-sm font-semibold text-gray-800">{alert.window_days}d</p>
            </div>
          </div>

          {/* Developer notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Developer notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this alert — what was investigated, what was changed…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 bg-white resize-none"
              disabled={alert.status === 'resolved'}
            />
          </div>

          {alert.status !== 'resolved' && (
            <div className="flex gap-2 flex-wrap">
              {alert.status === 'open' && (
                <button onClick={() => updateStatus('acknowledged')} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50">
                  <AlertTriangle size={12} /> Acknowledge
                </button>
              )}
              <button onClick={() => updateStatus('resolved')} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50">
                <CheckCircle size={12} /> Mark Resolved
              </button>
            </div>
          )}

          {alert.acknowledged_by_name && (
            <p className="text-xs text-gray-400">
              Acknowledged by <span className="font-medium text-gray-600">{alert.acknowledged_by_name}</span>
              {alert.acknowledged_at ? ` · ${new Date(alert.acknowledged_at).toLocaleDateString()}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIAlertsTab() {
  const [alerts, setAlerts]   = useState([]);
  const [counts, setCounts]   = useState({ open: 0, acknowledged: 0, resolved: 0 });
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/insights/alerts?status=${statusFilter}`);
      setAlerts(data.alerts || []);
      setCounts(data.counts || {});
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  function handleUpdate(updated) {
    setAlerts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    // refresh counts
    load();
  }

  async function downloadExport(format) {
    setExporting(true);
    try {
      const resp = await api.get(`/insights/training-export?format=${format}`, { responseType: 'blob' });
      const ext = format === 'jsonl' ? 'jsonl' : 'json';
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartvet-training-${new Date().toISOString().slice(0,10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  }

  const FILTER_TABS = [
    { id: 'open',         label: `Open (${counts.open ?? 0})` },
    { id: 'acknowledged', label: `In Review (${counts.acknowledged ?? 0})` },
    { id: 'resolved',     label: `Resolved (${counts.resolved ?? 0})` },
    { id: 'all',          label: 'All' },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-purple-600" />
          <span className="font-bold text-gray-900 text-sm">AI Model Alerts</span>
          {counts.open > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
              {counts.open} open
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 border border-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Export buttons */}
          <div className="flex items-center gap-1">
            <button onClick={() => downloadExport('jsonl')} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors disabled:opacity-50">
              <Download size={11} /> Export JSONL
            </button>
            <button onClick={() => downloadExport('json')} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
              <Download size={11} /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* Explainer */}
      <div className="px-5 py-3 bg-purple-50 border-b border-purple-100 text-xs text-purple-700 flex-shrink-0">
        Alerts are raised automatically when a disease accuracy drops below 65%, gets 5+ rejections in 7 days, or a vet corrects to a disease not in our model.
        Use the export to download all VetBoard-reviewed cases as a structured training dataset (JSONL for fine-tuning, JSON for analysis).
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {FILTER_TABS.map(f => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              statusFilter === f.id
                ? 'text-green-700 border-b-2 border-green-700 bg-green-50'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <p className="text-gray-400 text-sm text-center py-8">Loading alerts…</p>
        )}
        {!loading && alerts.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle size={36} className="text-green-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No {statusFilter !== 'all' ? statusFilter : ''} alerts</p>
            <p className="text-xs text-gray-400 mt-1">
              Alerts appear here automatically when VetBoard rejection rates exceed thresholds.
            </p>
          </div>
        )}
        {alerts.map(alert => (
          <AlertRow key={alert.id} alert={alert} onUpdate={handleUpdate} />
        ))}
      </div>
    </div>
  );
}
