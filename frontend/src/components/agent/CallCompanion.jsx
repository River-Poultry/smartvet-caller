import { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Activity, Stethoscope, Zap, FileText, ExternalLink,
  ChevronDown, ChevronUp, AlertTriangle, Truck, Clipboard, Package,
} from 'lucide-react';
import { useCallStore } from '../../store/callStore.js';
import api from '../../services/api.js';

const SYMPTOM_GROUPS = [
  { label: 'Feeding & Digestion', symptoms: ['Not eating', 'Diarrhea', 'Bloody droppings', 'Watery droppings', 'Green droppings'] },
  { label: 'Respiratory',         symptoms: ['Coughing', 'Sneezing', 'Gasping', 'Nasal discharge', 'Rattling / wheezing'] },
  { label: 'Behaviour',           symptoms: ['Lethargy', 'Drooping wings', 'Paralysis', 'Twisted neck', 'Limping'] },
  { label: 'Appearance',          symptoms: ['Ruffled feathers', 'Swollen head', 'Swollen face', 'Watery eyes', 'Scabs / lesions'] },
  { label: 'Mortality',           symptoms: ['High mortality', 'Sudden death', 'Many dead'] },
  { label: 'Production',          symptoms: ['Reduced egg production', 'Soft shell eggs', 'No shell eggs'] },
];

function DiseaseCard({ d, rank }) {
  const [open, setOpen] = useState(rank === 0);
  const pct = Math.round((d.confidence || 0) * 100);
  const isTop = rank === 0;

  return (
    <div className={`rounded-xl overflow-hidden border ${
      d.is_emergency ? 'border-sv-red/60' : 'border-sv-border'
    } bg-sv-bg-card`}>
      {/* Emergency strip */}
      {d.is_emergency && (
        <div className="h-0.5 bg-sv-red w-full" />
      )}

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start gap-2 mb-2">
          <span className={`text-xs font-bold w-5 flex-shrink-0 mt-0.5 ${
            isTop ? 'text-sv-amber' : 'text-sv-text-muted'
          }`}>{rank + 1}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold leading-snug ${
              d.is_emergency ? 'text-sv-red' : 'text-white'
            }`}>{d.name}</p>
            {d.matched_symptoms?.length > 0 && (
              <p className="text-xs text-sv-text-muted mt-0.5">
                Matched: {d.matched_symptoms.join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {d.is_zoonotic && (
              <span className="text-xs font-semibold text-sv-amber">ZOONOTIC</span>
            )}
            {d.is_notifiable && (
              <span className="text-xs font-bold text-sv-red animate-pulse">NOTIFY</span>
            )}
            <a href={`https://smartvet.africa/?q=${encodeURIComponent(d.name)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-sv-teal hover:text-white transition-colors">
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-2 mb-0.5">
          <div className="flex-1 h-1 bg-sv-bg rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              pct >= 70 ? 'bg-sv-red' : pct >= 45 ? 'bg-sv-amber' : 'bg-sv-teal'
            }`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-sv-text-muted w-8 text-right font-mono">{pct}%</span>
        </div>
      </div>

      {/* Treatment / Prevention accordion */}
      {(d.treatment || d.prevention) && (
        <>
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 border-t border-sv-border text-xs text-sv-text-muted hover:text-white transition-colors bg-sv-bg/40">
            <span className="font-medium">Treatment & Prevention</span>
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {open && (
            <div className="px-3 py-3 border-t border-sv-border space-y-3 bg-sv-bg/60">
              {d.treatment && (
                <div>
                  <p className="text-xs font-semibold text-sv-green uppercase tracking-wider mb-1">Treatment</p>
                  <p className="text-xs text-white/80 leading-relaxed">{d.treatment}</p>
                </div>
              )}
              {d.prevention && (
                <div>
                  <p className="text-xs font-semibold text-sv-teal uppercase tracking-wider mb-1">Prevention</p>
                  <p className="text-xs text-white/80 leading-relaxed">{d.prevention}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CallCompanion() {
  const {
    activeCall, symptoms, callNotes,
    addSymptomLocal, removeSymptomLocal, setCallNotes, appendCallNotes,
    transcriptSegments, openDispatchModal,
  } = useCallStore();

  const [custom, setCustom]           = useState('');
  const [severity, setSeverity]       = useState('moderate');
  const [diagnoses, setDiagnoses]     = useState([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isNotifiable, setIsNotifiable] = useState(false);
  const [section, setSection]         = useState('symptoms');
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const diagDebounce = useRef(null);

  useEffect(() => {
    clearTimeout(diagDebounce.current);
    if (!symptoms.length) { setDiagnoses([]); return; }
    diagDebounce.current = setTimeout(async () => {
      setDiagLoading(true);
      try {
        const { data } = await api.post('/diagnose', {
          symptoms: symptoms.map(s => s.symptom),
          free_text: symptoms.map(s => s.symptom).join(', '),
        });
        setDiagnoses(data.diagnoses || []);
        setIsEmergency(data.is_emergency || false);
        setIsNotifiable(data.is_notifiable || false);
      } catch {}
      setDiagLoading(false);
    }, 400);
    return () => clearTimeout(diagDebounce.current);
  }, [symptoms]);

  useEffect(() => {
    if (!diagnoses.length) { setDrugSuggestions([]); return; }
    const top = diagnoses.slice(0, 2).map(d => d.name).join(',');
    api.get(`/inventory/suggestions?diseases=${encodeURIComponent(top)}`)
      .then(r => setDrugSuggestions(r.data || []))
      .catch(() => {});
  }, [diagnoses.map(d => d.name).join()]);

  async function addSymptom(text) {
    const trimmed = text.trim();
    if (!trimmed || !activeCall?.call_id) return;
    const tempId = Date.now().toString();
    addSymptomLocal({ symptom: trimmed, severity, id: tempId });
    try {
      await api.post(`/calls/${activeCall.call_id}/symptoms`, { symptom: trimmed, severity });
    } catch {}
  }

  async function removeSymptom(id) {
    removeSymptomLocal(id);
    if (!activeCall?.call_id) return;
    try { await api.delete(`/calls/${activeCall.call_id}/symptoms/${id}`); } catch {}
  }

  function handleCustomAdd(e) {
    e.preventDefault();
    if (!custom.trim()) return;
    addSymptom(custom.trim());
    setCustom('');
  }

  function pullFromTranscript() {
    const text = transcriptSegments.map(s => s.text || s.content || '').join(' ');
    if (!text.trim()) return;
    const lines = [];
    const m = (re) => text.match(re);
    if (m(/(\d+[\s,]+birds?|flock of \d+|\d+ chickens?)/gi)?.[0]) lines.push(`Flock: ${m(/(\d+[\s,]+birds?|flock of \d+|\d+ chickens?)/gi)[0]}`);
    if (m(/(\d+\s*(days?|weeks?|months?)\s*old)/gi)?.[0]) lines.push(`Age: ${m(/(\d+\s*(days?|weeks?|months?)\s*old)/gi)[0]}`);
    if (m(/(since|for|started|began)\s+(\d+\s*(days?|weeks?|hours?))/gi)?.[0]) lines.push(`Duration: ${m(/(since|for|started|began)\s+(\d+\s*(days?|weeks?|hours?))/gi)[0]}`);
    if (m(/(\d+[\s,]+dead|died|mortality)/gi)?.[0]) lines.push(`Mortality: ${m(/(\d+[\s,]+dead|died|mortality)/gi)[0]}`);
    appendCallNotes(lines.length ? `[Transcript]\n${lines.join('\n')}` : `[Transcript]\n${text.slice(0, 300)}…`);
  }

  const activeLower = symptoms.map(s => s.symptom?.toLowerCase());

  const TABS = [
    { id: 'symptoms', label: 'Symptoms & AI', icon: Stethoscope },
    { id: 'drugs',    label: 'Drugs',          icon: Package,  dot: drugSuggestions.length > 0 },
    { id: 'notes',    label: 'Notes',           icon: FileText, dot: !!callNotes },
  ];

  return (
    <div className="flex flex-col h-full text-sm bg-sv-bg">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-sv-border flex-shrink-0 bg-sv-bg-card">
        <Activity size={13} className="text-sv-teal" />
        <span className="font-bold text-white text-xs tracking-wide uppercase">Call Companion</span>
        {symptoms.length > 0 && (
          <span className="text-xs bg-sv-green/15 text-sv-green px-2 py-0.5 rounded-full border border-sv-green/30 font-medium">
            {symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''}
          </span>
        )}
        {isEmergency && (
          <span className="ml-auto flex items-center gap-1 text-xs bg-sv-red/10 text-sv-red border border-sv-red/40 px-2.5 py-0.5 rounded-full animate-pulse font-bold uppercase tracking-wide">
            <AlertTriangle size={10} /> Emergency
          </span>
        )}
        {isNotifiable && !isEmergency && (
          <span className="ml-auto text-xs bg-sv-amber/10 text-sv-amber border border-sv-amber/40 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
            Notify Authorities
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-sv-border flex-shrink-0 bg-sv-bg-card">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold uppercase tracking-wide transition-colors relative ${
              section === t.id
                ? 'text-white border-b-2 border-sv-green'
                : 'text-sv-text-muted hover:text-white'
            }`}>
            <t.icon size={11} />
            {t.label}
            {t.dot && (
              <span className="absolute top-2 right-[calc(50%-22px)] w-1.5 h-1.5 rounded-full bg-sv-amber" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ══ SYMPTOMS & AI ══════════════════════════════════════════════════════ */}
        {section === 'symptoms' && (
          <div className="p-4 space-y-5">

            {!activeCall && (
              <div className="text-center text-sv-text-muted py-8 text-xs">
                <Activity size={28} className="mx-auto mb-3 opacity-20" />
                Start a call to track symptoms
              </div>
            )}

            {/* Symptom groups */}
            {SYMPTOM_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-bold text-sv-text-muted uppercase tracking-widest mb-2">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.symptoms.map(s => {
                    const active = activeLower.includes(s.toLowerCase());
                    return (
                      <button key={s}
                        disabled={!activeCall}
                        onClick={() => active
                          ? removeSymptom(symptoms.find(x => x.symptom.toLowerCase() === s.toLowerCase())?.id)
                          : addSymptom(s)
                        }
                        className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                          active
                            ? 'bg-sv-green border-sv-green text-white shadow-sv-glow'
                            : activeCall
                              ? 'border-sv-border text-sv-text-muted hover:border-sv-green/60 hover:text-white bg-sv-bg-input'
                              : 'border-sv-border/30 text-sv-border/50 cursor-not-allowed'
                        }`}>
                        {active ? '✓ ' : ''}{s}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Severity */}
            {activeCall && (
              <div>
                <p className="text-xs font-bold text-sv-text-muted uppercase tracking-widest mb-2">Severity</p>
                <div className="flex gap-2">
                  {[
                    { v: 'mild',     label: 'Mild',     cls: 'border-sv-green/60 text-sv-green hover:bg-sv-green/10',  active: 'bg-sv-green/20 border-sv-green text-sv-green' },
                    { v: 'moderate', label: 'Moderate', cls: 'border-sv-amber/60 text-sv-amber hover:bg-sv-amber/10',  active: 'bg-sv-amber/20 border-sv-amber text-sv-amber' },
                    { v: 'severe',   label: 'Severe',   cls: 'border-sv-red/60 text-sv-red hover:bg-sv-red/10',        active: 'bg-sv-red/20 border-sv-red text-sv-red' },
                  ].map(({ v, label, cls, active }) => (
                    <button key={v} onClick={() => setSeverity(v)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                        severity === v ? active : `border-sv-border text-sv-text-muted hover:${cls}`
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom symptom */}
            {activeCall && (
              <form onSubmit={handleCustomAdd} className="flex gap-2">
                <input value={custom} onChange={e => setCustom(e.target.value)}
                  placeholder="Describe symptom in farmer's words…"
                  className="flex-1 bg-sv-bg-input border border-sv-border rounded-full px-4 py-2 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green transition-colors" />
                <button type="submit" disabled={!custom.trim()}
                  className="px-3 py-2 bg-sv-green hover:bg-sv-green-d text-white rounded-full disabled:opacity-40 transition-colors">
                  <Plus size={13} />
                </button>
              </form>
            )}

            {/* Selected symptoms list */}
            {symptoms.length > 0 && (
              <div>
                <p className="text-xs font-bold text-sv-text-muted uppercase tracking-widest mb-2">
                  Logged ({symptoms.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map(s => (
                    <span key={s.id} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium ${
                      s.severity === 'severe'   ? 'border-sv-red/50 bg-sv-red/10 text-sv-red' :
                      s.severity === 'mild'     ? 'border-sv-green/50 bg-sv-green/10 text-sv-green' :
                                                  'border-sv-amber/50 bg-sv-amber/10 text-sv-amber'
                    }`}>
                      {s.symptom}
                      <button onClick={() => removeSymptom(s.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Divider before AI */}
            {(diagnoses.length > 0 || diagLoading) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-sv-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-sv-bg px-3 flex items-center gap-1.5 text-xs text-sv-text-muted font-semibold uppercase tracking-wider">
                    <Zap size={10} className="text-sv-green" />
                    AI Diagnosis
                    {diagLoading && <span className="animate-pulse">…</span>}
                  </span>
                </div>
              </div>
            )}

            {/* Disease cards */}
            {diagnoses.map((d, i) => (
              <DiseaseCard key={d.name} d={d} rank={i} />
            ))}

            {activeCall && !symptoms.length && (
              <p className="text-center text-sv-text-muted text-xs py-4">
                Select symptoms above → AI diagnosis appears instantly
              </p>
            )}
          </div>
        )}

        {/* ══ DRUGS ══════════════════════════════════════════════════════════════ */}
        {section === 'drugs' && (
          <div className="p-4 space-y-3">
            {!diagnoses.length ? (
              <div className="text-center text-sv-text-muted py-8 text-xs">
                <Package size={28} className="mx-auto mb-3 opacity-20" />
                Add symptoms first to get drug suggestions
              </div>
            ) : (
              <>
                <p className="text-xs text-sv-text-muted">
                  Based on: <span className="text-white font-medium">{diagnoses.slice(0, 2).map(d => d.name).join(', ')}</span>
                </p>

                {drugSuggestions.length === 0 && (
                  <p className="text-xs text-sv-text-muted text-center py-4">No inventory data for these diagnoses</p>
                )}

                {drugSuggestions.map((drug, i) => {
                  const catLabel = { vaccine: 'Vaccine', antibiotic: 'Antibiotic', antiparasitic: 'Antiparasitic', vitamin: 'Vitamin' }[drug.category] || 'Other';
                  const catColor = { vaccine: 'text-sv-teal', antibiotic: 'text-sv-amber', antiparasitic: 'text-purple-400', vitamin: 'text-sv-green' }[drug.category] || 'text-sv-text-muted';
                  const vetStock = parseFloat(drug.total_vet_stock || drug.total_stock || 0);
                  const warehouseStock = parseFloat(drug.warehouse_stock || 0);

                  return (
                    <div key={i} className="rounded-xl border border-sv-border bg-sv-bg-card overflow-hidden">
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-white text-xs">{drug.product_name}</p>
                            <p className={`text-xs font-medium ${catColor}`}>{catLabel}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-sv-bg rounded-lg px-3 py-2">
                            <p className="text-xs text-sv-text-muted mb-0.5">Vet field stock</p>
                            <p className="text-sm font-bold text-white">{vetStock.toFixed(0)} <span className="text-xs font-normal text-sv-text-muted">{drug.unit}</span></p>
                          </div>
                          <div className="bg-sv-bg rounded-lg px-3 py-2">
                            <p className="text-xs text-sv-text-muted mb-0.5">Warehouse</p>
                            <p className="text-sm font-bold text-white">{warehouseStock.toFixed(0)} <span className="text-xs font-normal text-sv-text-muted">{drug.unit}</span></p>
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-2 border-t border-sv-border bg-sv-bg/40">
                        <p className="text-xs text-sv-text-muted">From: <span className="text-white">{drug.available_from_vets?.join(', ')}</span></p>
                      </div>
                    </div>
                  );
                })}

                {drugSuggestions.length > 0 && (
                  <p className="text-xs text-sv-text-muted text-center pt-1">
                    Vets update field stock after each visit
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ NOTES ══════════════════════════════════════════════════════════════ */}
        {section === 'notes' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-sv-text-muted uppercase tracking-widest">Call Notes</p>
              {transcriptSegments.length > 0 && (
                <button onClick={pullFromTranscript}
                  className="flex items-center gap-1 text-xs text-sv-teal hover:text-white transition-colors border border-sv-teal/30 hover:border-sv-teal/60 rounded-full px-2.5 py-1 font-medium">
                  <Clipboard size={10} /> Pull from transcript
                </button>
              )}
            </div>

            <textarea
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
              placeholder={activeCall
                ? "Take notes here — flock size, age, housing conditions, farmer's history…\n\nThese notes will be sent to the vet on dispatch."
                : "Notes available during an active call."}
              rows={9}
              className="w-full bg-sv-bg-input border border-sv-border rounded-xl px-4 py-3 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green resize-none leading-relaxed transition-colors"
            />

            {(symptoms.length > 0 || callNotes) && (
              <div className="rounded-xl border border-sv-border bg-sv-bg-card p-3 space-y-1.5">
                <p className="text-xs font-bold text-sv-text-muted uppercase tracking-widest mb-2">Vet Preview</p>
                {symptoms.length > 0 && (
                  <p className="text-xs text-white/80">
                    <span className="text-sv-text-muted">Symptoms: </span>
                    {symptoms.map(s => s.symptom).join(', ')}
                  </p>
                )}
                {diagnoses[0] && (
                  <p className="text-xs text-white/80">
                    <span className="text-sv-text-muted">Top diagnosis: </span>
                    {diagnoses[0].name} ({Math.round(diagnoses[0].confidence * 100)}% confidence)
                  </p>
                )}
                {callNotes && (
                  <p className="text-xs text-white/80 whitespace-pre-wrap">
                    <span className="text-sv-text-muted">Notes: </span>{callNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispatch button */}
      {activeCall && (
        <div className="p-3 border-t border-sv-border flex-shrink-0 bg-sv-bg-card">
          <button onClick={() => openDispatchModal({ urgency: isEmergency ? 'emergency' : 'scheduled' })}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all border ${
              isEmergency
                ? 'bg-sv-red border-sv-red text-white animate-pulse hover:bg-sv-red-d'
                : 'bg-sv-green border-sv-green text-white hover:bg-sv-green-d'
            }`}>
            <Truck size={14} />
            {isEmergency ? 'Emergency Vet Dispatch' : 'Dispatch Vet'}
            {symptoms.length > 0 && (
              <span className="opacity-60 font-normal normal-case tracking-normal">({symptoms.length} symptoms)</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
