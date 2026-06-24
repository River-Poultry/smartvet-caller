import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Stethoscope, ThumbsUp, ThumbsDown, Minus, LogOut, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, BarChart2, Download,
  ChevronDown, ChevronUp, Clock, Target, Award, FileText,
  Activity, Filter, Users, Check,
} from 'lucide-react';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { ThemeToggle } from '../components/ui/ThemeToggle.jsx';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}

function MiniBar({ value = 0, max = 100, color = 'bg-green-500' }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────

function StatsPanel({ stats, onExport }) {
  const p = stats?.personal;
  const b = stats?.board;

  return (
    <div className="space-y-4">

      {/* My stats */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">My Activity</p>
        <div className="space-y-2">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-extrabold text-amber-600">{stats?.pending_count ?? '—'}</p>
            <p className="text-xs text-amber-500 font-semibold mt-0.5">Awaiting my review</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
              <p className="text-lg font-extrabold text-green-700">{p?.correct ?? '—'}</p>
              <p className="text-xs text-green-600">Correct</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 text-center">
              <p className="text-lg font-extrabold text-red-600">{p?.incorrect ?? '—'}</p>
              <p className="text-xs text-red-500">Incorrect</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
              <p className="text-lg font-extrabold text-amber-600">{p?.partial ?? '—'}</p>
              <p className="text-xs text-amber-500">Partial</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs text-gray-500">Reviews this month</span>
            <span className="text-sm font-bold text-gray-800">{p?.reviews_30d ?? '—'}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total all-time</span>
            <span className="text-sm font-bold text-gray-800">{p?.total_reviews ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Board-wide AI accuracy */}
      {b && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Board-Wide AI Accuracy</p>
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center mb-2">
            <p className="text-3xl font-extrabold text-teal-700">{b.ai_accuracy_pct ?? '—'}%</p>
            <p className="text-xs text-teal-500 mt-0.5">AI diagnosis accuracy</p>
            <p className="text-xs text-gray-400 mt-1">from {b.total_reviews} reviews by {b.total_reviewers} reviewers</p>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Avg confidence when correct',  value: b.avg_confidence_when_correct, color: 'text-green-700' },
              { label: 'Avg confidence when wrong',    value: b.avg_confidence_when_wrong,   color: 'text-red-600' },
            ].map(r => (
              <div key={r.label} className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className={`text-sm font-bold ${r.color}`}>{r.value != null ? `${r.value}%` : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disease accuracy */}
      {stats?.by_disease?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Accuracy by Disease</p>
          <div className="space-y-1.5">
            {stats.by_disease.filter(d => d.disease !== 'Other').map(d => (
              <div key={d.disease} className="bg-white border border-gray-100 rounded-lg px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate">{d.disease}</span>
                  <span className={`text-xs font-bold ml-2 flex-shrink-0 ${
                    d.accuracy_pct >= 70 ? 'text-green-700' :
                    d.accuracy_pct >= 40 ? 'text-amber-600' : 'text-red-500'
                  }`}>{d.accuracy_pct ?? '—'}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <MiniBar value={d.accuracy_pct ?? 0} max={100} color={
                    d.accuracy_pct >= 70 ? 'bg-green-500' :
                    d.accuracy_pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                  } />
                  <span className="text-xs text-gray-400 flex-shrink-0">{d.reviews} reviews</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <button onClick={onExport}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest hover:bg-teal-100 transition-colors">
        <Download size={12} /> Export Training Dataset
      </button>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  correct:   { icon: CheckCircle,  label: 'Correct',   bg: 'bg-green-700', ring: 'ring-green-500', text: 'text-white' },
  partial:   { icon: Minus,        label: 'Partial',    bg: 'bg-amber-500', ring: 'ring-amber-400', text: 'text-white' },
  incorrect: { icon: XCircle,      label: 'Incorrect',  bg: 'bg-red-600',   ring: 'ring-red-500',   text: 'text-white' },
};

const CHECKBOXES = [
  { key: 'diagnosis_accurate',  label: 'Disease name correct' },
  { key: 'treatment_accurate',  label: 'Treatment advice appropriate' },
  { key: 'severity_accurate',   label: 'Emergency / severity call correct' },
  { key: 'confidence_accurate', label: 'Confidence score appropriate' },
];

function ReviewCard({ s, onReview }) {
  const existing = s.verdict ? {
    verdict: s.verdict,
    diagnosis_accurate:  s.diagnosis_accurate,
    treatment_accurate:  s.treatment_accurate,
    severity_accurate:   s.severity_accurate,
    confidence_accurate: s.confidence_accurate,
    field_note:          s.field_note || '',
    suggested_diagnosis: s.suggested_diagnosis || '',
    true_severity:       s.true_severity || '',
  } : null;

  const [expanded, setExpanded] = useState(!existing);
  const [verdict, setVerdict] = useState(existing?.verdict || '');
  const [checks, setChecks] = useState({
    diagnosis_accurate:  existing?.diagnosis_accurate ?? null,
    treatment_accurate:  existing?.treatment_accurate ?? null,
    severity_accurate:   existing?.severity_accurate ?? null,
    confidence_accurate: existing?.confidence_accurate ?? null,
  });
  const [fieldNote, setFieldNote] = useState(existing?.field_note || '');
  const [suggestedDx, setSuggestedDx] = useState(existing?.suggested_diagnosis || '');
  const [trueSeverity, setTrueSeverity] = useState(existing?.true_severity || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing);

  function toggleCheck(key) {
    setChecks(c => ({ ...c, [key]: c[key] === true ? false : c[key] === false ? null : true }));
    setSaved(false);
  }

  async function submit() {
    if (!verdict) return;
    setSaving(true);
    try {
      await onReview({
        suggestion_id: s.id, verdict, ...checks,
        field_note: fieldNote, suggested_diagnosis: suggestedDx, true_severity: trueSeverity,
      });
      setSaved(true);
      setExpanded(false);
    } catch {}
    setSaving(false);
  }

  const verdictCfg = VERDICT_CONFIG[verdict];

  return (
    <div className={`rounded-2xl border bg-white transition-all ${
      saved
        ? verdict === 'correct'   ? 'border-green-200' :
          verdict === 'incorrect' ? 'border-red-200' :
          verdict === 'partial'   ? 'border-amber-200' : 'border-gray-200'
        : 'border-gray-200'
    }`}>

      {/* Header — always visible */}
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {s.is_emergency && (
              <span className="text-xs bg-red-50 border border-red-200 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Emergency</span>
            )}
            {s.was_acted_on && (
              <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">✓ Agent acted on this</span>
            )}
            <span className="text-xs text-gray-400">
              {s.farmer_name || s.phone_number || '—'} · {fmt(s.call_date)} · Agent: {s.agent_name || '—'}
            </span>
          </div>
          {/* Only show text preview when collapsed */}
          {!expanded && (
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{s.suggestion_text}</p>
          )}
          {!expanded && s.confidence_score && (
            <p className="text-xs text-gray-400 mt-1">AI confidence: {Math.round(s.confidence_score * 100)}%</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {saved && verdict && verdictCfg && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              verdict === 'correct' ? 'bg-green-100 text-green-700' :
              verdict === 'incorrect' ? 'bg-red-100 text-red-600' :
              'bg-amber-100 text-amber-700'
            }`}>{verdictCfg.label}</span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded review panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">

          {/* AI output — read-only box at top of expanded panel */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">AI Suggestion to Review</p>
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{s.suggestion_text}</p>
              {s.confidence_score && (
                <p className="text-xs text-teal-600 mt-1.5 font-medium">AI confidence: {Math.round(s.confidence_score * 100)}%</p>
              )}
            </div>
          </div>

          {/* Verdict selector */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Overall Verdict</p>
            <div className="flex gap-2">
              {Object.entries(VERDICT_CONFIG).map(([v, cfg]) => {
                const Icon = cfg.icon;
                const active = verdict === v;
                return (
                  <button key={v} onClick={() => { setVerdict(v); setSaved(false); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wide transition-all ${
                      active
                        ? `${cfg.bg} ${cfg.text} border-transparent ring-2 ${cfg.ring}`
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon size={13} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dimension checkboxes */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Dimension Breakdown</p>
            <div className="grid grid-cols-2 gap-2">
              {CHECKBOXES.map(({ key, label }) => {
                const val = checks[key];
                return (
                  <button key={key} type="button" onClick={() => toggleCheck(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${
                      val === true  ? 'border-green-400 bg-green-50 text-green-800' :
                      val === false ? 'border-red-300 bg-red-50 text-red-700' :
                      'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}>
                    <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                      val === true  ? 'bg-green-600 border-green-600' :
                      val === false ? 'bg-red-500 border-red-500' :
                      'border-gray-300'
                    }`}>
                      {val === true  && <Check size={9} className="text-white" strokeWidth={3} />}
                      {val === false && <XCircle size={9} className="text-white" />}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Click once = ✓, twice = ✗, three times = unset</p>
          </div>

          {/* True severity override */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">True Severity (your assessment)</p>
            <div className="flex gap-1.5">
              {['low', 'moderate', 'high', 'critical', 'unknown'].map(sev => (
                <button key={sev} onClick={() => { setTrueSeverity(sev === trueSeverity ? '' : sev); setSaved(false); }}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                    trueSeverity === sev
                      ? sev === 'critical' ? 'bg-red-600 border-red-600 text-white' :
                        sev === 'high'     ? 'bg-orange-500 border-orange-500 text-white' :
                        sev === 'moderate' ? 'bg-amber-500 border-amber-500 text-white' :
                        sev === 'low'      ? 'bg-green-600 border-green-600 text-white' :
                        'bg-gray-500 border-gray-500 text-white'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}>
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Alternative diagnosis (if incorrect) */}
          {(verdict === 'incorrect' || verdict === 'partial') && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Correct / More Likely Diagnosis</p>
              <input type="text" value={suggestedDx}
                onChange={e => { setSuggestedDx(e.target.value); setSaved(false); }}
                placeholder="e.g. Infectious Bronchitis + CRD co-infection"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          )}

          {/* Field experience note */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Field Context / Experience Note</p>
            <textarea value={fieldNote} onChange={e => { setFieldNote(e.target.value); setSaved(false); }} rows={3}
              placeholder="Your clinical reasoning, field experience, or additional context that supports or contradicts this diagnosis…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 resize-none leading-relaxed transition-colors"
            />
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={!verdict || saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-widest disabled:opacity-40 transition-colors">
            {saving
              ? <><RefreshCw size={12} className="animate-spin" /> Saving…</>
              : saved
              ? <><Check size={12} /> Review Saved</>
              : <><Check size={12} /> Submit Review</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: 'pending',   label: 'Pending my review' },
  { value: 'all',       label: 'All suggestions' },
  { value: 'correct',   label: 'Marked correct' },
  { value: 'incorrect', label: 'Marked incorrect' },
  { value: 'partial',   label: 'Marked partial' },
];

export default function VetBoardDashboard() {
  const { agent, logout } = useAuthStore();
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [verdict, setVerdict] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [view, setView] = useState('queue'); // 'queue' | 'stats'
  const LIMIT = 20;

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, verdict });
      const { data } = await api.get(`/vet-board/queue?${params}`);
      setSuggestions(data.suggestions || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [page, verdict]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/vet-board/stats');
      setStats(data);
    } catch {}
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);
  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleReview(payload) {
    await api.post('/vet-board/review', payload);
    loadStats();
    loadSuggestions();
  }

  async function handleExport() {
    try {
      const { data } = await api.get('/vet-board/export');
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `smartvet-training-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">

      {/* Header */}
      <header className="sticky top-0 z-20 flex-shrink-0 bg-white/90 border-b border-black/[0.07]" style={{ backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="flex items-center justify-between px-5 py-2">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SmartVet" className="h-7 w-auto" onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight tracking-tight">Vet Science Board</p>
              <p className="text-[11px] text-gray-400 leading-none mt-0.5">AI Diagnosis Review Panel</p>
            </div>

            <div className="h-6 w-px bg-gray-200" />

            {/* View toggle */}
            <nav className="flex items-center gap-0.5">
              {[
                { id: 'queue', icon: Stethoscope, label: 'Review Queue' },
                { id: 'stats', icon: BarChart2,   label: 'Board Stats' },
              ].map(t => (
                <button key={t.id} onClick={() => setView(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    view === t.id ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {stats && (
              <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 border-r border-gray-200 pr-3 mr-1">
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-amber-500"/>
                  <span className="font-bold text-amber-600">{stats.pending_count}</span> pending
                </span>
                {stats.board?.ai_accuracy_pct != null && (
                  <span className="flex items-center gap-1">
                    <Target size={11} className="text-teal-500"/>
                    <span className="font-bold text-teal-700">{stats.board.ai_accuracy_pct}%</span> AI accuracy
                  </span>
                )}
              </div>
            )}
            <ThemeToggle />
            <div className="text-xs text-gray-600 font-semibold border border-gray-200 px-2.5 py-1.5 rounded-lg bg-gray-50">
              Dr. {agent?.name}
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — stats always visible on desktop */}
        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4">
          {statsLoading
            ? <p className="text-xs text-gray-400 text-center py-8">Loading stats…</p>
            : <StatsPanel stats={stats} onExport={handleExport} />
          }
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {view === 'queue' && (
            <>
              {/* Queue toolbar */}
              <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
                <Filter size={13} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-700">
                  {FILTER_OPTIONS.find(f => f.value === verdict)?.label}
                </span>
                <span className="text-xs text-gray-400">{total} suggestions</span>
                <div className="ml-auto flex items-center gap-2">
                  <select value={verdict} onChange={e => { setVerdict(e.target.value); setPage(1); }}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-teal-500 transition-colors">
                    {FILTER_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <button onClick={loadSuggestions}
                    className={`p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors ${loading ? 'animate-spin' : ''}`}>
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {loading && (
                  <div className="text-center py-12 text-gray-400 text-sm">Loading suggestions…</div>
                )}
                {!loading && suggestions.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle size={32} className="mx-auto text-green-300 mb-3" />
                    <p className="text-gray-500 font-semibold">
                      {verdict === 'pending' ? 'All caught up — no pending reviews!' : 'No suggestions match this filter'}
                    </p>
                  </div>
                )}
                {!loading && suggestions.length > 0 && (
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {suggestions.map(s => (
                      <ReviewCard key={s.id} s={s} onReview={handleReview} />
                    ))}
                  </div>
                )}

                {total > LIMIT && (
                  <div className="flex items-center justify-between mt-6 max-w-3xl mx-auto">
                    <span className="text-xs text-gray-500">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                    <div className="flex gap-2">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">← Prev</button>
                      <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next →</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {view === 'stats' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="lg:hidden mb-6">
                  {statsLoading
                    ? <p className="text-xs text-gray-400 text-center py-8">Loading…</p>
                    : <StatsPanel stats={stats} onExport={handleExport} />
                  }
                </div>
                {!statsLoading && stats?.by_disease && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <BarChart2 size={14} className="text-teal-600" /> AI Accuracy by Disease — All Reviewers
                    </h3>
                    <div className="space-y-2">
                      {stats.by_disease.map(d => (
                        <div key={d.disease} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-800">{d.disease}</span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-green-700 font-bold">{d.correct} correct</span>
                              <span className="text-red-500 font-bold">{d.incorrect} wrong</span>
                              <span className={`font-extrabold text-sm ${
                                d.accuracy_pct >= 70 ? 'text-green-700' :
                                d.accuracy_pct >= 40 ? 'text-amber-600' : 'text-red-500'
                              }`}>{d.accuracy_pct ?? '—'}%</span>
                            </div>
                          </div>
                          <MiniBar value={d.accuracy_pct ?? 0} max={100} color={
                            d.accuracy_pct >= 70 ? 'bg-green-500' :
                            d.accuracy_pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                          } />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
