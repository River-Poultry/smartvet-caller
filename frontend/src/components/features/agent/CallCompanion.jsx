import { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Activity, Stethoscope, Zap, FileText,
  ChevronDown, ChevronUp, AlertTriangle, Truck, Clipboard,
  Package, ExternalLink, Check, Bird,
} from 'lucide-react';
import { useCallStore } from '../../../store/callStore.js';
import api from '../../../services/api.js';

const BIRD_TYPES = [
  { value: 'broiler',     label: 'Broiler',      note: 'Commercial meat' },
  { value: 'layer',       label: 'Layer',         note: 'Egg production' },
  { value: 'sasso',       label: 'Sasso',         note: 'Colored broiler' },
  { value: 'kienyeji',    label: 'Kienyeji',      note: 'Indigenous / local' },
  { value: 'turkey',      label: 'Turkey',         note: '' },
  { value: 'duck',        label: 'Duck',           note: '' },
  { value: 'guinea_fowl', label: 'Guinea Fowl',   note: '' },
  { value: 'quail',       label: 'Quail',          note: '' },
];

const VACCINES = [
  { value: 'newcastle',    label: 'Newcastle (ND)' },
  { value: 'gumboro',      label: 'Gumboro (IBD)' },
  { value: 'mareks',       label: "Marek's" },
  { value: 'ib',           label: 'Inf. Bronchitis' },
  { value: 'fowl_typhoid', label: 'Fowl Typhoid' },
  { value: 'fowl_pox',     label: 'Fowl Pox' },
];

function calcAgeDays(value, unit) {
  const n = parseInt(value);
  if (!n || n <= 0) return null;
  if (unit === 'days')   return n;
  if (unit === 'weeks')  return n * 7;
  if (unit === 'months') return Math.round(n * 30.4);
  return null;
}

function ageGroup(ageDays) {
  if (!ageDays) return '';
  if (ageDays <= 14)  return 'Chick (0–2 wks)';
  if (ageDays <= 42)  return 'Young (2–6 wks)';
  if (ageDays <= 126) return 'Growing (6–18 wks)';
  return 'Adult (>18 wks)';
}

function FlockTab({ fd, setFlock }) {
  const flockSize = parseInt(fd.flockSize) || 0;
  const deadCount = parseInt(fd.deadCount) || 0;
  const mortalityPct = flockSize > 0 ? ((deadCount / flockSize) * 100).toFixed(1) : null;
  const ageDays = calcAgeDays(fd.ageValue, fd.ageUnit);

  const mortalityColor =
    mortalityPct === null   ? 'text-gray-400' :
    mortalityPct >= 30      ? 'text-red-600 font-bold' :
    mortalityPct >= 15      ? 'text-red-500 font-semibold' :
    mortalityPct >= 5       ? 'text-amber-600 font-semibold' :
    mortalityPct >= 2       ? 'text-amber-500' : 'text-green-700';

  function toggleVax(v) {
    const cur = fd.vaccinations || [];
    setFlock({ vaccinations: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  }

  return (
    <div className="p-5 space-y-6">

      {/* Bird Type */}
      <div>
        <div className="flex items-center gap-2 mb-2"><span className="w-1 h-3.5 rounded-full bg-gray-200 flex-shrink-0" /><p className="text-[11px] font-semibold text-gray-500">Bird Type</p></div>
        <div className="grid grid-cols-2 gap-1.5">
          {BIRD_TYPES.map(bt => (
            <button key={bt.value} type="button"
              onClick={() => setFlock({ birdType: fd.birdType === bt.value ? '' : bt.value })}
              className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all ${
                fd.birdType === bt.value
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}>
              <span className="font-semibold">{bt.label}</span>
              {bt.note && <span className="text-xs text-gray-400 mt-0.5">{bt.note}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div>
        <div className="flex items-center gap-2 mb-2"><span className="w-1 h-3.5 rounded-full bg-gray-200 flex-shrink-0" /><p className="text-[11px] font-semibold text-gray-500">Bird Age</p></div>
        <div className="flex gap-2 items-center">
          <input type="number" min="1" value={fd.ageValue}
            onChange={e => setFlock({ ageValue: e.target.value })}
            placeholder="e.g. 3"
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600 transition-colors" />
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {['days','weeks','months'].map(u => (
              <button key={u} type="button"
                onClick={() => setFlock({ ageUnit: u })}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  fd.ageUnit === u ? 'bg-green-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}>
                {u}
              </button>
            ))}
          </div>
        </div>
        {ageDays && (
          <p className="text-xs text-gray-500 mt-1.5">
            = {ageDays} days old · <span className="text-green-700 font-medium">{ageGroup(ageDays)}</span>
          </p>
        )}
      </div>

      {/* Flock Size & Deaths */}
      <div>
        <div className="flex items-center gap-2 mb-2"><span className="w-1 h-3.5 rounded-full bg-gray-200 flex-shrink-0" /><p className="text-[11px] font-semibold text-gray-500">Flock Size &amp; Mortality</p></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Total birds</label>
            <input type="number" min="1" value={fd.flockSize}
              onChange={e => setFlock({ flockSize: e.target.value })}
              placeholder="e.g. 500"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Current deaths</label>
            <input type="number" min="0" value={fd.deadCount}
              onChange={e => setFlock({ deadCount: e.target.value })}
              placeholder="e.g. 12"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-600 transition-colors" />
          </div>
        </div>
        {mortalityPct !== null && (
          <div className={`mt-2 text-sm ${mortalityColor}`}>
            Mortality rate: <strong>{mortalityPct}%</strong>
            <span className="text-gray-400 text-xs ml-2">
              ({deadCount} of {flockSize} birds)
            </span>
          </div>
        )}
      </div>

      {/* Vaccinations */}
      <div>
        <div className="flex items-center gap-2 mb-2"><span className="w-1 h-3.5 rounded-full bg-gray-200 flex-shrink-0" /><p className="text-[11px] font-semibold text-gray-500">Vaccinations Given</p></div>
        <div className="flex flex-wrap gap-1.5">
          {VACCINES.map(v => {
            const active = (fd.vaccinations || []).includes(v.value);
            return (
              <button key={v.value} type="button" onClick={() => toggleVax(v.value)}
                className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  active
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-teal-300'
                }`}>
                {active && <Check size={9} />}
                {v.label}
              </button>
            );
          })}
        </div>
        {(fd.vaccinations || []).length === 0 && (
          <p className="text-xs text-gray-400 mt-1.5">Tap vaccines the farmer has used</p>
        )}
      </div>
    </div>
  );
}

const SYMPTOM_GROUPS = [
  {
    label: 'Mortality — Rate',
    symptoms: [
      'Under 2% mortality (normal)',
      '2–5% mortality (mild)',
      '5–15% mortality (moderate)',
      '15–30% mortality (severe)',
      'Over 30% mortality (critical)',
    ],
  },
  {
    label: 'Mortality — How Birds Died',
    symptoms: [
      'Found dead on back (flip-over)',
      'Found dead on belly / prone',
      'Found dead on side',
      'Star-gazing before death',
      'Paddling / convulsions before death',
      'Sudden death — no prior signs',
      'Gradual deaths over several days',
      'Death after brief illness (< 24 h)',
    ],
  },
  {
    label: 'Feeding & Digestion',
    symptoms: [
      'Not eating', 'Reduced feed intake', 'Diarrhea', 'Bloody droppings',
      'Watery droppings', 'Green droppings', 'Yellow / sulphur droppings',
      'White / chalky droppings', 'Wet litter', 'Cloacal pasting',
      'Proventricular swelling', 'Gizzard erosion',
    ],
  },
  {
    label: 'Respiratory',
    symptoms: [
      'Coughing', 'Sneezing', 'Gasping / open-mouth breathing',
      'Nasal discharge', 'Rattling / wheezing', 'Gurgling',
      'Laboured breathing', 'Head shaking', 'Tracheal rales',
      'Conjunctivitis / eye discharge',
    ],
  },
  {
    label: 'Behaviour & Nervous System',
    symptoms: [
      'Lethargy / depression', 'Huddling together', 'Drooping wings',
      'Paralysis', 'Twisted neck (torticollis)', 'Limping',
      'Tremors / shaking', 'Incoordination / falling over',
      'Not moving', 'Excitability / restlessness',
    ],
  },
  {
    label: 'Appearance & Skin',
    symptoms: [
      'Ruffled feathers', 'Pale comb', 'Blue / dark comb',
      'Swollen head', 'Swollen face / sinuses', 'Swollen eye',
      'Watery / sunken eyes', 'Scabs / warts / pustules',
      'Mouth / throat lesions', 'Gangrenous / dark skin patches',
      'Feather loss', 'Subcutaneous bleeding / haemorrhage',
    ],
  },
  {
    label: 'Broiler Specific',
    symptoms: [
      'Water belly (ascites)', 'Breast blister',
      'Footpad sores / contact dermatitis', 'Leg bowing / angular deformity',
      'Swollen hock joints', 'Poor weight gain / runting',
      'Uneven flock size', 'Pale / anaemic appearance',
      'Flip-over (sudden death on back)', 'Rapid growth birds affected most',
    ],
  },
  {
    label: 'Musculoskeletal',
    symptoms: [
      'Lameness', 'Leg weakness', 'Swollen joints', 'Bone deformity',
      'Soft / rubbery bones', 'Wing drooping', 'Cannot stand',
    ],
  },
  {
    label: 'Production (Layers)',
    symptoms: [
      'Reduced egg production', 'Sudden drop in production',
      'Soft shell eggs', 'No shell eggs', 'Thin shell eggs',
      'Misshapen eggs', 'Pale yolk', 'Watery albumen',
    ],
  },
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
      <span className="text-xs text-gray-400 font-mono w-8 text-right">{pct}%</span>
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
                  <span className="text-xs font-bold text-amber-700 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded">ZOONOTIC</span>
                )}
                {d.is_notifiable && (
                  <span className="text-xs font-bold text-red-600 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded animate-pulse">NOTIFY</span>
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
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
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
                  <p className="text-[11px] font-semibold text-green-700 mb-1">Treatment</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{d.treatment}</p>
                </div>
              )}
              {d.prevention && (
                <div>
                  <p className="text-[11px] font-semibold text-teal-600 mb-1">Prevention</p>
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
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            inStock ? 'text-green-700 border-green-200 bg-green-50' : 'text-gray-400 border-gray-200 bg-gray-50'
          }`}>
            {inStock ? 'IN STOCK' : 'LOW'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">Field stock</p>
            <p className="text-sm font-bold text-gray-900">{vetStock.toFixed(0)} <span className="text-xs font-normal text-gray-400">{drug.unit}</span></p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">Warehouse</p>
            <p className="text-sm font-bold text-gray-900">{warehouseStock.toFixed(0)} <span className="text-xs font-normal text-gray-400">{drug.unit}</span></p>
          </div>
        </div>
      </div>
      {drug.available_from_vets?.length > 0 && (
        <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">Via: <span className="text-gray-800 font-medium">{drug.available_from_vets.join(', ')}</span></p>
        </div>
      )}
    </div>
  );
}

export function CallCompanion() {
  const {
    activeCall, symptoms, callNotes, flockDetails, setFlockDetails,
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
          flock_details: flockDetails,
        });
        setDiagnoses(data.diagnoses || []);
        setIsEmergency(data.is_emergency || false);
        setIsNotifiable(data.is_notifiable || false);
      } catch {}
      setDiagLoading(false);
    }, 400);
    return () => clearTimeout(diagDebounce.current);
  }, [symptoms, flockDetails]);

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

  const flockFilled = !!(flockDetails.birdType || flockDetails.flockSize || flockDetails.ageValue);

  const TABS = [
    { id: 'symptoms',  label: 'Symptoms', shortLabel: 'Sx',  icon: Stethoscope },
    { id: 'flock',     label: 'Flock',    shortLabel: 'Flock', icon: Bird,      dot: flockFilled },
    { id: 'diagnosis', label: 'Diagnosis',shortLabel: 'AI',  icon: Zap,         dot: diagnoses.length > 0 },
    { id: 'drugs',     label: 'Drugs',    shortLabel: 'Rx',  icon: Package,     dot: drugSuggestions.length > 0 },
    { id: 'notes',     label: 'Notes',    shortLabel: 'Notes',icon: FileText,   dot: !!callNotes },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-sm">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={14} className="text-teal-600 flex-shrink-0" />
          <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">Call Companion</span>
          {symptoms.length > 0 && (
            <span className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200 font-semibold flex-shrink-0 tabular-nums">
              {symptoms.length}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {isEmergency && (
            <span className="flex items-center gap-1 text-[11px] bg-red-600 text-white px-2.5 py-1 rounded-full animate-pulse font-semibold">
              <AlertTriangle size={10} /> Emergency
            </span>
          )}
          {isNotifiable && !isEmergency && (
            <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
              Notify Auth.
            </span>
          )}
        </div>
      </div>

      {/* Tab bar — pill/segment control style */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setSection(t.id)}
              className={`relative flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[9px] text-[11px] font-semibold transition-all ${
                section === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon size={11} className={section === t.id ? 'text-green-700' : ''} />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
              {t.dot && (
                <span className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-50">

        {/* SYMPTOMS */}
        {section === 'symptoms' && (
          <div className="p-4 space-y-5">

            {/* Severity — segmented control */}
            <div>
              <p className="text-[11px] font-medium text-gray-400 mb-2">Severity for new symptoms</p>
              <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                {SEVERITY_CONFIG.map(({ v, label }) => {
                  const activeColor = v === 'mild' ? 'text-green-700' : v === 'moderate' ? 'text-amber-600' : 'text-red-600';
                  return (
                    <button key={v} onClick={() => setSeverity(v)}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-[9px] transition-all ${
                        severity === v
                          ? `bg-white shadow-sm ${activeColor}`
                          : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {SYMPTOM_GROUPS.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-3.5 rounded-full bg-gray-200 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-gray-500">{group.label}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.symptoms.map(s => {
                    const active = activeLower.includes(s.toLowerCase());
                    const activeSym = symptoms.find(x => x.symptom.toLowerCase() === s.toLowerCase());
                    const chipCls = active
                      ? (SEVERITY_CONFIG.find(c => c.v === activeSym?.severity)?.chip || 'border-green-200 bg-green-50 text-green-700') + ' shadow-sm'
                      : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900';
                    return (
                      <button key={s}
                        disabled={!activeCall}
                        onClick={() => active ? removeSymptom(activeSym?.id) : addSymptom(s)}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${chipCls}`}>
                        {active && <Check size={9} />}
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-3.5 rounded-full bg-green-400 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-gray-500">Logged — {symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''}</p>
                </div>
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
        {section === 'flock' && (
          <FlockTab fd={flockDetails} setFlock={setFlockDetails} />
        )}

        {section === 'diagnosis' && (
          <div className="p-5 space-y-4">
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
          <div className="p-5 space-y-3">
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
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-1 h-3.5 rounded-full bg-gray-200 flex-shrink-0" /><p className="text-[11px] font-semibold text-gray-500">Call Notes</p></div>
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
                <div className="flex items-center gap-2"><span className="w-1 h-3.5 rounded-full bg-teal-400 flex-shrink-0" /><p className="text-[11px] font-semibold text-gray-500">Vet Handover Preview</p></div>
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
        <div className="px-3 py-2.5 border-t border-gray-100 flex-shrink-0 bg-white">
          <button
            onClick={() => openDispatchModal({ urgency: isEmergency ? 'emergency' : 'scheduled' })}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold tracking-tight transition-all ${
              isEmergency
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_2px_8px_rgba(220,38,38,0.35)] animate-pulse'
                : 'bg-green-700 hover:bg-green-600 text-white shadow-[0_2px_8px_rgba(21,128,61,0.3)]'
            }`}>
            <Truck size={15} />
            {isEmergency ? 'Emergency Vet Dispatch' : 'Dispatch Vet'}
            {symptoms.length > 0 && (
              <span className="opacity-60 text-xs font-normal">· {symptoms.length} sx</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
