import { useState, useEffect } from 'react';
import { RefreshCw, Phone, Truck, Users, Stethoscope } from 'lucide-react';
import api from '../../../services/api.js';

function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <p className={`text-3xl font-black tracking-tight ${color}`}>{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-gray-600 capitalize flex-shrink-0">{label.replace('_', ' ')}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-xs text-gray-500 text-right">{value}</span>
    </div>
  );
}

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/analytics');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const callStatuses = data?.calls?.by_status || [];
  const dispatchStatuses = data?.dispatch?.by_status || [];
  const vetboardStatuses = data?.vetboard?.by_status || [];
  const maxCallStatus = Math.max(...callStatuses.map(r => Number(r.n)), 1);
  const maxDispatchStatus = Math.max(...dispatchStatuses.map(r => Number(r.n)), 1);
  const maxVetStatus = Math.max(...vetboardStatuses.map(r => Number(r.n)), 1);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-2 sticky top-0 z-10">
        <span className="text-sm font-semibold text-gray-700">System Analytics</span>
        <button onClick={load} className="ml-auto p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-red-500 text-sm px-6 py-4">{error}</p>}

      {loading && !data && (
        <p className="text-gray-400 text-sm text-center py-12">Loading…</p>
      )}

      {data && (
        <div className="p-5 space-y-6 max-w-5xl mx-auto">

          {/* Top-level KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Calls" value={data.calls?.total} color="text-blue-700" sub="all time" />
            <StatCard label="Dispatches" value={data.dispatch?.total} color="text-green-700" sub="all time" />
            <StatCard label="Farmers" value={data.farmers?.total} color="text-amber-600" sub="registered" />
            <StatCard label="VSB Reviews" value={data.vetboard?.total} color="text-teal-700" sub="AI suggestion reviews" />
          </div>

          {/* Breakdown rows */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Calls by status */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Phone size={13} className="text-blue-500" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Calls by Status</p>
              </div>
              <div className="space-y-2">
                {callStatuses.length === 0 && <p className="text-xs text-gray-400">No data</p>}
                {callStatuses.map(r => (
                  <BarRow key={r.status} label={r.status || 'unknown'} value={Number(r.n)} max={maxCallStatus} />
                ))}
              </div>
            </div>

            {/* Dispatch by status */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck size={13} className="text-green-600" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dispatch by Status</p>
              </div>
              <div className="space-y-2">
                {dispatchStatuses.length === 0 && <p className="text-xs text-gray-400">No data</p>}
                {dispatchStatuses.map(r => (
                  <BarRow key={r.status} label={r.status || 'unknown'} value={Number(r.n)} max={maxDispatchStatus} />
                ))}
              </div>
            </div>

            {/* VSB reviews by verdict */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope size={13} className="text-teal-600" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">VSB Reviews by Verdict</p>
              </div>
              <div className="space-y-2">
                {vetboardStatuses.length === 0 && <p className="text-xs text-gray-400">No data</p>}
                {vetboardStatuses.map(r => (
                  <BarRow key={r.status} label={r.status || 'unknown'} value={Number(r.n)} max={maxVetStatus} />
                ))}
              </div>
            </div>
          </div>

          {/* Calls last 7 days */}
          {data.calls?.last_7_days?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Calls — Last 7 Days</p>
              <div className="flex items-end gap-2 h-20">
                {data.calls.last_7_days.map(r => {
                  const max = Math.max(...data.calls.last_7_days.map(x => Number(x.n)), 1);
                  const h = Math.max(8, Math.round((Number(r.n) / max) * 72));
                  return (
                    <div key={r.day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-blue-700">{r.n}</span>
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${h}px` }} />
                      <span className="text-[10px] text-gray-400">{new Date(r.day).toLocaleDateString('en-UG', { weekday: 'short' })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agent performance */}
          {data.agents?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={13} className="text-gray-500" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Agent Performance</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-bold text-gray-400 uppercase pb-2 pr-3">Agent</th>
                    <th className="text-left text-xs font-bold text-gray-400 uppercase pb-2 pr-3">Role</th>
                    <th className="text-right text-xs font-bold text-gray-400 uppercase pb-2">Calls Handled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((a, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 font-medium text-gray-900">{a.name}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500 capitalize">{a.role}</td>
                      <td className="py-2 text-right font-bold text-blue-700">{a.calls_handled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
