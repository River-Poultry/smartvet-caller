import { useEffect, useState } from 'react';
import { api } from '../api/client';

const OUTCOME_LABELS = {
  completed: 'Completed',
  confirmed: 'Confirmed',
  no_answer: 'No Answer',
  voicemail: 'Voicemail',
  callback_needed: 'Callback Needed',
};

const OUTCOME_COLORS = {
  completed: 'bg-gray-200 text-gray-800',
  confirmed: 'bg-green-100 text-green-800',
  no_answer: 'bg-amber-100 text-amber-800',
  voicemail: 'bg-blue-100 text-blue-800',
  callback_needed: 'bg-red-100 text-red-800',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, colorClass = 'bg-brand-red' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 text-gray-600 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-gray-700 font-medium text-right">{value}</span>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!data) return <p className="text-gray-400">Loading analytics…</p>;

  const maxCaseStatus = Math.max(...data.cases.by_status.map((s) => s.n), 1);
  const maxCallOutcome = Math.max(...data.calls.by_outcome.map((s) => s.n), 1);
  const maxAgentCalls = Math.max(...data.agents.map((a) => a.calls_made), 1);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">Analytics</h1>
      <p className="text-sm text-gray-500 mb-6">System-wide performance overview</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Cases" value={data.cases.total} />
        <StatCard label="Total Calls Logged" value={data.calls.total} />
        <StatCard label="Call Recordings" value={data.recordings.total} sub={`${data.recordings.total_minutes} min recorded`} />
        <StatCard label="AI Summaries Generated" value={data.ai.summaries_generated} sub={`${data.ai.recordings_transcribed} transcribed`} />
      </div>

      {/* VSB Reviews */}
      {data.vetboard && (
        <div className="bg-white border border-amber-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Vet Science Board Reviews</h2>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-800">{data.vetboard.total}</p>
              <p className="text-sm text-gray-500">Total Reviews</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              {data.vetboard.by_status.map((s) => (
                <div key={s.status} className="text-center">
                  <p className="text-xl font-bold text-gray-800">{s.n}</p>
                  <p className="text-xs text-gray-500 capitalize">{s.status.replace('_', ' ')}</p>
                </div>
              ))}
              {data.vetboard.by_status.length === 0 && (
                <p className="text-sm text-gray-400">No reviews yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Cases by status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Cases by Status</h2>
          <div className="space-y-2">
            {data.cases.by_status.length === 0 && <p className="text-gray-400 text-sm">No data yet</p>}
            {data.cases.by_status.map((s) => (
              <BarRow key={s.status} label={s.status.replace('_', ' ')} value={s.n} max={maxCaseStatus} />
            ))}
          </div>
        </div>

        {/* Cases by priority */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Cases by Priority</h2>
          <div className="space-y-2">
            {data.cases.by_priority.length === 0 && <p className="text-gray-400 text-sm">No data yet</p>}
            {data.cases.by_priority.map((s) => (
              <BarRow key={s.priority} label={s.priority} value={s.n} max={Math.max(...data.cases.by_priority.map((p) => p.n), 1)} colorClass="bg-brand-navy" />
            ))}
          </div>
        </div>

        {/* Call outcomes */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Call Outcomes</h2>
          <div className="space-y-2">
            {data.calls.by_outcome.length === 0 && <p className="text-gray-400 text-sm">No calls logged yet</p>}
            {data.calls.by_outcome.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_COLORS[s.status] || 'bg-gray-100 text-gray-700'}`}>
                  {OUTCOME_LABELS[s.status] || s.status}
                </span>
                <span className="font-medium text-gray-700">{s.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Monitor */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 mb-3">AI System Usage</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Transcript summaries</span>
              <span className="font-semibold text-gray-800">{data.ai.summaries_generated}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Recordings transcribed</span>
              <span className="font-semibold text-gray-800">{data.ai.recordings_transcribed}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total recorded audio</span>
              <span className="font-semibold text-gray-800">{data.recordings.total_minutes} min</span>
            </div>
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
              AI model endpoint: connect via <code>AI_MODEL_API_URL</code> in backend/.env to enable live inference metrics.
            </div>
          </div>
        </div>
      </div>

      {/* Agent performance */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-700 mb-3">Agent Performance</h2>
        {data.agents.length === 0
          ? <p className="text-gray-400 text-sm">No agent data yet</p>
          : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left border-b border-gray-100">
              <tr>
                <th className="pb-2 font-medium">Agent</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Calls Made</th>
                <th className="pb-2 font-medium">Cases Handled</th>
                <th className="pb-2 font-medium w-40">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.agents.map((a) => (
                <tr key={a.name}>
                  <td className="py-2 text-gray-800 font-medium">{a.name}</td>
                  <td className="py-2 text-gray-500 capitalize">{a.role}</td>
                  <td className="py-2 text-gray-700">{a.calls_made}</td>
                  <td className="py-2 text-gray-700">{a.cases_handled}</td>
                  <td className="py-2">
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div className="bg-brand-red h-1.5 rounded-full" style={{ width: `${maxAgentCalls > 0 ? Math.round((a.calls_made / maxAgentCalls) * 100) : 0}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
