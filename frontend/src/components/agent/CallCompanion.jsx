import { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Activity, Stethoscope, Zap, FileText,
  ChevronDown, ChevronUp, AlertTriangle, Truck, Clipboard,
  Package, ExternalLink, Check,
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

const SEVERITY_CONFIG = [
  { v: 'mild',     label: 'Mild',     chip: 'border-green-200 bg-green-50 text-green-700',  ring: 'ring-green-400' },
  { v: 'moderate', label: 'Moderate', chip: 'border-amber-200 bg-amber-50 text-amber-700',  ring: 'ring-amber-400' },
  { v: 'severe',   label: 'Severe',   chip: 'border-red-200   bg-red-50   text-red-600',    ring: 'ring-red-400'   },
];

function ConfidenceBar({ pct, isEmergency }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isEmergency ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-teal-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-gray-400 font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}

function DiseaseCard({ d, rank }) {
  const [open, setOpen] = useState(rank === 0);
  const pct = Math.round((d.confidence || 0) * 100);

  return (
    <div className={`rounded-xl overflow-hidden border ${
      d.is_emergency ? 'border-red-200 shadow-sm' : 'border-gray-200'
    } bg-white`}>
      {d.is_emergency && <div className="h-0.5 bg-red-500 w-full" />}

      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <span className={`text-sm font-black w-5 flex-shrink-0 mt-0.5 ${rank === 0 ? 'text-amber-500' : 'text-gray-300'}`}>
            {rank + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`font-bold text-sm leading-snug ${d.is_emergency ? 'text-red-600' : 'text-gray-900'}`}>
                {d.name}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {d.is_zoonotic && (
                  <span className="text-[10px] font-bold text-amber-700 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded">ZOONOTIC</span>
                )}
                {d.is_notifiable && (
                  <span className="text-[10px] font-bold text-red-600 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded animate-pulse">NOTIFY</span>
                )}
                <a href={`https://smartvet.africa/?q=${encodeURIComponent(d.name)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-teal-600 transition-colors">
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
            <ConfidenceBar pct={pct} isEmergency={d.is_emergency} />
            {d.matched_symptoms?.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                Matched: {d.matched_symptoms.join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {(d.treatment || d.prevention) && (
        <>
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-3.5 py-2 border-t border-gray-100 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
            <span className="font-semibold">Treatment &amp; Prevention</span>
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {open && (
            <div className="px-3.5 py-3 border-t border-gray-100 space-y-3 bg-gray-50">
              {d.treatment && (
                <div>
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">Treatment</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{d.treatment}</p>
                </div>
              )}
              {d.prevention && (
                <div>
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Prevention</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{d.prevention}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DrugCard({ drug }) {
  const catLabel = { vaccine: 'Vaccine', antibiotic: 'Antibiotic', antiparasitic: 'Antiparasitic', vitamin: 'Vitamin' }[drug.category] || 'Other';
  const catColor = { vaccine: 'text-teal-600', antibiotic: 'text-amber-600', antiparasitic: 'text-purple-600', vitamin: 'text-green-700' }[drug.category] || 'text-gray-500';
  const vetStock = parseFloat(drug.total_vet_stock || drug.total_stock || 0);
  const warehouseStock = parseFloat(drug.warehouse_stock || 0);
  const inStock = vetStock > 0 || warehouseStock > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{drug.product_name}</p>
            <p className={`text-xs font-medium mt-0.5 ${catColor}`}>{catLabel}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            inStock ? 'text-green-700 border-green-200 bg-green-50' : 'text-gray-400 border-gray-200 bg-gray-50'
          }`}>
            {inStock ? 'IN STOCK' : 'LOW'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Field stock</p>
            <p className="text-sm font-bold text-gray-900">{vetStock.toFixed(0)} <span className="text-xs font-normal text-gray-400">{drug.unit}</span></p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Warehouse</p>
            <p className="text-sm font-bold text-gray-900">{warehouseStock.toFixed(0)} <span className="text-xs font-normal text-gray-400">{drug.unit}</span></p>
          </div>
        </div>
      </div>
      {drug.available_from_vets?.length > 0 && (
        <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-500">Via: <span className="text-gray-800 font-medium">{drug.available_from_vets.join(', ')}</span></p>
        </div>
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

  const [custom, setCustom]             = useState('');
  const [severity, setSeverity]         = useState('moderate');
  const [diagnoses, setDiagnoses]       = useState([]);
  const [diagLoading, setDiagLoading]   = useState(false);
  const [isEmergency, setIsEmergency]   = useState(false);
  const [isNotifiable, setIsNotifiable] = useState(false);
  const [section, setSection]           = useState('symptoms');
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const diagDebounce = useRef(null);

  useEffect(() => {
    clearTimeout(diagDebounce.current);
    if (!symptoms.length) { setDiagnoses([]); setIsEmergency(false); setIsNotifiable(false); return; }
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
    { id: 'symptoms',  label: 'Symptoms',    icon: Stethoscope },
    { id: 'diagnosis', label: 'AI Diagnosis', icon: Zap,       dot: diagnoses.length > 0 },
    { id: 'drugs',     label: 'Drugs',        icon: Package,   dot: drugSuggestions.length > 0 },
    { id: 'notes',     label: 'Notes',        icon: FileText,  dot: !!callNotes },
  ];

  const sevCfg = SEVERITY_CONFIG.find(s => s.v === severity);

  return (
    <div className="flex flex-col h-full bg-white text-sm">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white flex-shrink-0">
        <Activity size={13} className="text-teal-600 flex-shrink-0" />
        <span className="font-bold text-gray-900 text-xs uppercase tracking-widest">Call Companion</span>

        {symptoms.length > 0 && (
          <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-semibold">
            {symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isEmergency && (
            <span className="flex items-center gap-1 text-[11px] bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full animate-pulse font-bold uppercase tracking-wide">
              <AlertTriangle size={10} /> Emergency
            </span>
          )}
          {isNotifiable && !isEmergency && (
            <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Notify Authorities
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors relative ${
              section === t.id
                ? 'text-green-700 border-b-2 border-green-700 bg-green-50'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}>
            <t.icon size={11} />
            {t.label}
            {t.dot && (
              <span className="absolute top-2 right-[calc(50%-20px)] w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-50">

        {/* SYMPTOMS */}
        {section === 'symptoms' && (
          <div className="p-4 space-y-5">

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Severity for new selections</p>
              <div className="flex gap-2">
                {SEVERITY_CONFIG.map(({ v, label, chip, ring }) => (
                  <button key={v} onClick={() => setSeverity(v)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      severity === v
                        ? `${chip} ring-1 ring-inset ${ring}`
                        : 'border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {SYMPTOM_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.symptoms.map(s => {
                    const active = activeLower.includes(s.toLowerCase());
                    const activeSym = symptoms.find(x => x.symptom.toLowerCase() === s.toLowerCase());
                    const chipCls = active
                      ? SEVERITY_CONFIG.find(c => c.v === activeSym?.severity)?.chip || 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:text-gray-900 hover:bg-green-50';
                    return (
                      <button key={s}
                        disabled={!activeCall}
                        onClick={() => active ? removeSymptom(activeSym?.id) : addSymptom(s)}
                        className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${chipCls}`}>
                        {active && <Check size={10} />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <form onSubmit={handleCustomAdd} className={`flex gap-2 ${!activeCall ? 'opacity-40 pointer-events-none' : ''}`}>
              <input value={custom} onChange={e => setCustom(e.target.value)}
                placeholder="Type a custom symptom…"
                className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors" />
              <button type="submit" disabled={!custom.trim()}
                className="px-3 py-2 bg-green-700 hover:bg-green-800 text-white rounded-full disabled:opacity-40 transition-colors">
                <Plus size={13} />
              </button>
            </form>

            {symptoms.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Logged ({symptoms.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map(s => {
                    const cfg = SEVERITY_CONFIG.find(c => c.v === s.severity);
                    return (
                      <span key={s.id} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium ${cfg?.chip || 'border-gray-200 text-gray-500'}`}>
                        {s.symptom}
                        <button onClick={() => removeSymptom(s.id)} className="opacity-50 hover:opacity-100 transition-opacity ml-0.5">
                          <X size={9} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {!activeCall && (
              <div className="text-center py-6 text-gray-400">
                <Activity size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Start or receive a call to log symptoms</p>
              </div>
            )}

            {activeCall && symptoms.length === 0 && (
              <p className="text-center text-gray-400 text-xs py-2">
                Select symptoms above — AI diagnosis runs instantly
              </p>
            )}
          </div>
        )}

        {/* AI DIAGNOSIS */}
        {section === 'diagnosis' && (
          <div className="p-4 space-y-4">
            {diagLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse">
                <Zap size={12} className="text-green-600" /> Running diagnosis…
              </div>
            )}
            {!symptoms.length && !diagLoading && (
              <div className="text-center py-10 text-gray-400">
                <Zap size={28} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs">Add symptoms first to get an AI diagnosis</p>
              </div>
            )}
            {diagnoses.map((d, i) => <DiseaseCard key={d.name} d={d} rank={i} />)}
          </div>
        )}

        {/* DRUGS */}
        {section === 'drugs' && (
          <div className="p-4 space-y-3">
            {!diagnoses.length ? (
              <div className="text-center py-10 text-gray-400">
                <Package size={28} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs">Add symptoms to get drug suggestions</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Based on: <span className="text-gray-800 font-medium">{diagnoses.slice(0, 2).map(d => d.name).join(', ')}</span>
                </p>
                {drugSuggestions.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-4">No inventory data for these diagnoses</p>
                  : drugSuggestions.map((drug, i) => <DrugCard key={i} drug={drug} />)
                }
              </>
            )}
          </div>
        )}

        {/* NOTES */}
        {section === 'notes' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Call Notes</p>
              {transcriptSegments.length > 0 && (
                <button onClick={pullFromTranscript}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 border border-teal-200 hover:border-teal-300 rounded-full px-2.5 py-1 font-medium transition-colors">
                  <Clipboard size={10} /> Pull from transcript
                </button>
              )}
            </div>

            <textarea value={callNotes} onChange={e => setCallNotes(e.target.value)}
              placeholder="Flock size, age, housing, farmer's history, observations…&#10;&#10;These notes will be sent to the vet on dispatch."
              rows={8}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 resize-none leading-relaxed transition-colors" />

            {(symptoms.length > 0 || callNotes) && (
              <div className="rounded-xl border border-gray-200 bg-white p-3.5 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vet Handover Preview</p>
                {symptoms.length > 0 && (
                  <p className="text-xs text-gray-700 leading-relaxed">
                    <span className="text-gray-400">Symptoms: </span>{symptoms.map(s => s.symptom).join(', ')}
                  </p>
                )}
                {diagnoses[0] && (
                  <p className="text-xs text-gray-700">
                    <span className="text-gray-400">Top AI diagnosis: </span>
                    {diagnoses[0].name} <span className="text-gray-400">({Math.round(diagnoses[0].confidence * 100)}%)</span>
                  </p>
                )}
                {callNotes && (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                    <span className="text-gray-400">Notes: </span>{callNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispatch footer */}
      {activeCall && (
        <div className="p-3 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={() => openDispatchModal({ urgency: isEmergency ? 'emergency' : 'scheduled' })}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${
              isEmergency
                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                : 'bg-green-700 text-white hover:bg-green-800'
            }`}>
            <Truck size={13} />
            {isEmergency ? 'Emergency Vet Dispatch' : 'Dispatch Vet'}
            {symptoms.length > 0 && (
              <span className="opacity-70 font-normal normal-case tracking-normal text-[11px]">({symptoms.length} symptoms)</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
