import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, Users, Phone, AlertTriangle, CheckCircle,
  Clock, Stethoscope, Truck, ThumbsUp, ThumbsDown, ChevronDown,
  ChevronRight, X, RefreshCw, Activity, Target, Zap, FileText,
  MessageSquare, ArrowUpRight,
} from 'lucide-react';
import api from '../../../services/api.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(s) {
  if (!s) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function pct(n, d) {
  if (!d) return '—';
  return `${Math.round((n / d) * 100)}%`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, color = 'text-green-700', bg = 'bg-green-50', border = 'border-green-100' }) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className={color} />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl font-extrabold ${color} leading-none`}>{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color = 'text-gray-700' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className={color} />
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
    </div>
  );
}

function MiniBar({ value, max, color = 'bg-green-600' }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

function DaySparkline({ data }) {
  if (!data?.length) return <div className="h-10 flex items-center justify-center text-xs text-gray-300">No data</div>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.day}: ${d.total} calls`}>
          <div
            className="w-full rounded-sm bg-green-500 opacity-80 hover:opacity-100 transition-opacity"
            style={{ height: `${Math.max(2, Math.round((d.total / max) * 40))}px` }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Call Drilldown Modal ─────────────────────────────────────────────────────

function CallDrilldown({ callId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackState, setFeedbackState] = useState({});

  useEffect(() => {
    if (!callId) return;
    setLoading(true);
    api.get(`/insights/call/${callId}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [callId]);

  async function giveFeedback(suggestionId, correct) {
    setFeedbackState(s => ({ ...s, [suggestionId]: correct }));
    await api.patch(`/insights/suggestion/${suggestionId}/feedback`, { correct }).catch(() => {});
  }

  if (!callId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-teal-600" />
            <span className="text-sm font-bold text-gray-900">Call Detail</span>
            {data?.call?.is_emergency && (
              <span className="text-[10px] bg-red-50 border border-red-200 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide animate-pulse">Emergency</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={15} /></button>
        </div>

        {loading && <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>}

        {!loading && data && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Call metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Farmer',   value: data.call.farmer_name || data.call.phone_number },
                { label: 'Agent',    value: data.call.agent_name || '—' },
                { label: 'Started',  value: fmt(data.call.started_at) },
                { label: 'Duration', value: fmtDuration(data.call.duration_seconds) },
                { label: 'Intent',   value: (data.call.call_intent || '—').replace('_', ' ') },
                { label: 'Outcome',  value: (data.call.outcome || '—').replace('_', ' ') },
              ].map(f => (
                <div key={f.label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Agent notes */}
            {data.call.agent_notes && (
              <div>
                <SectionHeader icon={MessageSquare} title="Agent Notes" color="text-gray-500" />
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">{data.call.agent_notes}</p>
              </div>
            )}

            {/* AI Suggestions with feedback */}
            {data.suggestions.length > 0 && (
              <div>
                <SectionHeader icon={Zap} title={`AI Suggestions (${data.suggestions.length})`} color="text-teal-600" />
                <div className="space-y-2">
                  {data.suggestions.map(s => {
                    const fb = feedbackState[s.id] ?? s.feedback_correct;
                    return (
                      <div key={s.id} className={`rounded-xl border p-3 ${
                        s.category === 'escalation_alert' ? 'border-red-200 bg-red-50' :
                        s.category === 'disease_diagnosis' ? 'border-teal-100 bg-teal-50' :
                        'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                s.category === 'escalation_alert' ? 'bg-red-100 text-red-600' :
                                s.category === 'disease_diagnosis' ? 'bg-teal-100 text-teal-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>{s.category.replace('_', ' ')}</span>
                              {s.confidence_score && (
                                <span className="text-[10px] text-gray-400">{Math.round(s.confidence_score * 100)}% confidence</span>
                              )}
                              {s.was_acted_on && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">✓ Acted on</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-4">{s.suggestion_text}</p>
                          </div>

                          {/* Feedback buttons */}
                          <div className="flex flex-col gap-1 flex-shrink-0 ml-2">
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider text-center mb-0.5">Correct?</p>
                            <button onClick={() => giveFeedback(s.id, true)}
                              className={`p-1.5 rounded-lg border transition-all ${fb === true ? 'bg-green-100 border-green-400 text-green-700' : 'border-gray-200 text-gray-300 hover:text-green-600 hover:border-green-300'}`}>
                              <ThumbsUp size={11} />
                            </button>
                            <button onClick={() => giveFeedback(s.id, false)}
                              className={`p-1.5 rounded-lg border transition-all ${fb === false ? 'bg-red-100 border-red-400 text-red-600' : 'border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-300'}`}>
                              <ThumbsDown size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transcript */}
            {data.transcript.length > 0 && (
              <div>
                <SectionHeader icon={MessageSquare} title={`Transcript (${data.transcript.length} segments)`} color="text-gray-500" />
                <div className="space-y-1.5 max-h-64 overflow-y-auto bg-gray-50 rounded-xl p-3">
                  {data.transcript.map(t => (
                    <div key={t.id} className={`flex gap-2 text-xs ${t.speaker === 'farmer' ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                        t.speaker === 'farmer' ? 'text-blue-600' :
                        t.speaker === 'agent'  ? 'text-green-700' : 'text-gray-400'
                      }`}>{t.speaker}</span>
                      <p className={`rounded-lg px-2.5 py-1.5 text-xs leading-relaxed max-w-[75%] ${
                        t.speaker === 'farmer' ? 'bg-blue-50 text-blue-900' :
                        t.speaker === 'agent'  ? 'bg-green-50 text-green-900' :
                        'bg-gray-100 text-gray-500 italic'
                      }`}>{t.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Performance Table ──────────────────────────────────────────────────

function AgentTable({ agents }) {
  if (!agents?.length) return <p className="text-xs text-gray-400 text-center py-6">No agent data</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Agent', 'Role', 'Calls', 'Avg Duration', 'Diagnosis', 'Escalations', 'Resolution', 'AI Suggestions', 'AI Acted On'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((a, i) => (
            <tr key={a.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
              <td className="px-3 py-2.5">
                <p className="font-semibold text-gray-900">{a.name}</p>
                <p className="text-gray-400 text-[10px]">{a.email}</p>
              </td>
              <td className="px-3 py-2.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                  a.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                  a.role === 'supervisor' ? 'bg-blue-50 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{a.role}</span>
              </td>
              <td className="px-3 py-2.5 font-bold text-gray-800">{a.total_calls}</td>
              <td className="px-3 py-2.5 text-gray-600 font-mono">{fmtDuration(a.avg_duration_s)}</td>
              <td className="px-3 py-2.5">
                <span className="text-teal-700 font-semibold">{a.diagnosis_calls}</span>
                <span className="text-gray-400 ml-1">({pct(a.diagnosis_calls, a.total_calls)})</span>
              </td>
              <td className="px-3 py-2.5">
                <span className={`font-semibold ${a.emergency_calls > 0 ? 'text-red-600' : 'text-gray-400'}`}>{a.emergency_calls}</span>
              </td>
              <td className="px-3 py-2.5">
                {a.resolution_rate != null
                  ? <div className="flex items-center gap-2">
                      <span className={`font-bold ${a.resolution_rate >= 70 ? 'text-green-700' : a.resolution_rate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {a.resolution_rate}%
                      </span>
                      <MiniBar value={a.resolution_rate} max={100} color={a.resolution_rate >= 70 ? 'bg-green-500' : a.resolution_rate >= 40 ? 'bg-amber-400' : 'bg-red-400'} />
                    </div>
                  : <span className="text-gray-300">—</span>
                }
              </td>
              <td className="px-3 py-2.5 text-gray-600">{a.suggestions_generated ?? '—'}</td>
              <td className="px-3 py-2.5">
                {a.suggestions_generated > 0
                  ? <span className="text-teal-700 font-semibold">{pct(a.suggestions_acted_on, a.suggestions_generated)}</span>
                  : <span className="text-gray-300">—</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Disease Table ────────────────────────────────────────────────────────────

function DiseaseTable({ diseases, suggestionStats }) {
  if (!diseases?.length) return <p className="text-xs text-gray-400 text-center py-6">No diagnosis data yet</p>;
  const maxMentions = Math.max(...diseases.map(d => d.mentions), 1);

  return (
    <div className="space-y-1.5">
      {diseases.filter(d => d.disease !== 'Other').map((d, i) => (
        <div key={d.disease} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
          <span className="w-5 text-[11px] font-bold text-gray-300 text-right">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-gray-800 truncate">{d.disease}</p>
              {d.emergency_count > 0 && (
                <span className="flex-shrink-0 text-[10px] bg-red-50 border border-red-200 text-red-600 px-1.5 py-0.5 rounded-full font-bold">⚠ {d.emergency_count} emergency</span>
              )}
            </div>
            <MiniBar value={d.mentions} max={maxMentions} color="bg-teal-500" />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 text-right">
            <div>
              <p className="text-[10px] text-gray-400">Mentions</p>
              <p className="text-sm font-bold text-gray-800">{d.mentions}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Avg conf.</p>
              <p className={`text-sm font-bold ${d.avg_confidence >= 70 ? 'text-green-700' : d.avg_confidence >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{d.avg_confidence ?? '—'}%</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Acted on</p>
              <p className="text-sm font-bold text-teal-700">{d.acted_on}</p>
            </div>
          </div>
        </div>
      ))}

      {suggestionStats && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total AI suggestions',    value: suggestionStats.total_suggestions, color: 'text-gray-700' },
            { label: 'Acted on by agents',       value: suggestionStats.total_acted,       color: 'text-green-700' },
            { label: 'Avg AI confidence',        value: `${suggestionStats.avg_confidence ?? '—'}%`, color: 'text-teal-700' },
            { label: 'Escalation alerts',        value: suggestionStats.escalation_suggestions, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">{s.label}</p>
              <p className={`text-lg font-extrabold ${s.color}`}>{s.value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main InsightsTab ─────────────────────────────────────────────────────────

export default function InsightsTab() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [diseases, setDiseases] = useState(null);
  const [agentStats, setAgentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drilldownId, setDrilldownId] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [callsLoading, setCallsLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ds, ag] = await Promise.all([
        api.get(`/insights/overview?days=${days}`),
        api.get(`/insights/diseases?days=${days}`),
        api.get(`/insights/agents?days=${days}`),
      ]);
      setOverview(ov.data);
      setDiseases(ds.data);
      setAgentStats(ag.data);
    } catch {}
    setLoading(false);
  }, [days]);

  const loadCalls = useCallback(async () => {
    setCallsLoading(true);
    try {
      const { data } = await api.get(`/calls?limit=50&page=1`);
      setRecentCalls(data.calls || []);
    } catch {}
    setCallsLoading(false);
  }, []);

  useEffect(() => { load(); loadCalls(); }, [load, loadCalls]);

  const kpi = overview?.kpi;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
        <BarChart2 size={14} className="text-teal-600" />
        <span className="text-sm font-bold text-gray-800">Insights & Training Data</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 transition-colors ${days === d ? 'bg-green-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={() => { load(); loadCalls(); }}
            className={`p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors ${loading ? 'animate-spin' : ''}`}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 bg-gray-50">

        {/* ── KPI Overview ── */}
        <section>
          <SectionHeader icon={Activity} title={`Overview — last ${days} days`} color="text-green-700" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <KPICard icon={Phone}         label="Total Calls"     value={kpi?.total_calls}      sub={`${kpi?.calls_today ?? '—'} today · ${kpi?.calls_7d ?? '—'} this week`} />
            <KPICard icon={Stethoscope}   label="Diagnoses"       value={kpi?.diagnosis_calls}  sub={pct(kpi?.diagnosis_calls, kpi?.total_calls) + ' of calls'} color="text-teal-700" bg="bg-teal-50" border="border-teal-100" />
            <KPICard icon={AlertTriangle} label="Emergencies"     value={kpi?.emergency_calls}  sub={pct(kpi?.emergency_calls, kpi?.total_calls) + ' of calls'} color="text-red-600" bg="bg-red-50" border="border-red-100" />
            <KPICard icon={Truck}         label="Vet Dispatched"  value={kpi?.vet_requested}    sub={pct(kpi?.vet_requested, kpi?.total_calls) + ' of calls'} color="text-blue-700" bg="bg-blue-50" border="border-blue-100" />
            <KPICard icon={CheckCircle}   label="Resolved"        value={kpi?.resolved}         sub={`Avg handle: ${fmtDuration(kpi?.avg_duration_s)}`} />
          </div>

          {/* Sparkline */}
          {overview?.daily_volume?.length > 0 && (
            <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Daily call volume</p>
              <DaySparkline data={overview.daily_volume} />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">{overview.daily_volume[0]?.day}</span>
                <span className="text-[10px] text-gray-400">{overview.daily_volume.at(-1)?.day}</span>
              </div>
            </div>
          )}

          {/* Intent + Outcome breakdown */}
          {(overview?.intent_breakdown?.length > 0 || overview?.outcome_breakdown?.length > 0) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {overview?.intent_breakdown?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Call intent breakdown</p>
                  <div className="space-y-2">
                    {overview.intent_breakdown.map(r => (
                      <div key={r.call_intent} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-32 truncate capitalize">{(r.call_intent || 'unknown').replace('_', ' ')}</span>
                        <MiniBar value={r.cnt} max={kpi?.total_calls || 1} color="bg-teal-500" />
                        <span className="text-xs font-bold text-gray-700 w-8 text-right">{r.cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {overview?.outcome_breakdown?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Call outcome breakdown</p>
                  <div className="space-y-2">
                    {overview.outcome_breakdown.map(r => (
                      <div key={r.outcome} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-32 truncate capitalize">{(r.outcome || 'unknown').replace('_', ' ')}</span>
                        <MiniBar value={r.cnt} max={kpi?.total_calls || 1} color={
                          r.outcome === 'resolved' ? 'bg-green-500' :
                          r.outcome === 'vet_requested' ? 'bg-blue-500' :
                          r.outcome === 'follow_up' ? 'bg-amber-400' : 'bg-gray-300'
                        } />
                        <span className="text-xs font-bold text-gray-700 w-8 text-right">{r.cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Disease Intelligence ── */}
        <section>
          <SectionHeader icon={Stethoscope} title="Disease Diagnosis Intelligence" color="text-teal-700" />
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {loading
              ? <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
              : <DiseaseTable diseases={diseases?.disease_mentions} suggestionStats={diseases?.suggestion_stats} />
            }
          </div>
        </section>

        {/* ── Agent Performance ── */}
        <section>
          <SectionHeader icon={Users} title="Agent Performance" color="text-blue-700" />
          {loading
            ? <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
            : <AgentTable agents={agentStats?.agents} />
          }
        </section>

        {/* ── Call Log Drilldown ── */}
        <section>
          <SectionHeader icon={Phone} title="Call Log — click any row to drill down" color="text-gray-600" />
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {callsLoading && <p className="text-xs text-gray-400 text-center py-6">Loading…</p>}
            {!callsLoading && recentCalls.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No calls yet</p>
            )}
            {!callsLoading && recentCalls.length > 0 && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['', 'Farmer', 'Agent', 'Date', 'Duration', 'Intent', 'Outcome', 'Dispatch', ''].map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map((c, i) => (
                    <tr key={c.id}
                      onClick={() => setDrilldownId(c.id)}
                      className={`border-b border-gray-100 cursor-pointer hover:bg-teal-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-2 py-2.5 text-center w-6">
                        {c.is_emergency && <span className="inline-block w-2 h-2 rounded-full bg-red-500" />}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-gray-800">{c.farmer_name || '—'}</p>
                        <p className="text-gray-400 text-[10px]">{c.phone_number}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{c.agent_name || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmt(c.started_at)}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-500">
                        {c.duration_seconds ? fmtDuration(c.duration_seconds) : '—'}
                      </td>
                      <td className="px-3 py-2.5 capitalize text-gray-600">
                        {(c.call_intent || '—').replace('_', ' ')}
                      </td>
                      <td className="px-3 py-2.5">
                        {c.outcome
                          ? <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize ${
                              c.outcome === 'resolved'      ? 'bg-green-50 text-green-700 border-green-200' :
                              c.outcome === 'vet_requested' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              c.outcome === 'follow_up'     ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>{c.outcome.replace('_', ' ')}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {parseInt(c.dispatch_count) > 0
                          ? <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">{c.dispatch_count}</span>
                          : <span className="text-gray-200">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-gray-300 hover:text-teal-500">
                        <ChevronRight size={12} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>

      <CallDrilldown callId={drilldownId} onClose={() => setDrilldownId(null)} />
    </div>
  );
}
