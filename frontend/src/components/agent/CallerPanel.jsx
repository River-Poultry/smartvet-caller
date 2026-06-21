import { useState, useEffect, useRef } from 'react';
import { Search, Phone, MapPin, ChevronDown, ChevronUp, AlertCircle, ExternalLink, RefreshCw, Stethoscope } from 'lucide-react';
import { useCallStore } from '../../store/callStore.js';
import { OutreachPanel } from './OutreachPanel.jsx';
import api from '../../services/api.js';

function FarmerProfile({ farmer }) {
  const [batches, setBatches] = useState([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!farmer?.django_id && !farmer?.id) return;
    api.get(`/farmers/${farmer.id}`).then(r => setBatches(r.data.batches || [])).catch(() => {});
  }, [farmer?.id]);

  if (!farmer) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
        <p className="text-xs font-bold text-gray-900 truncate">{farmer.name}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{farmer.phone}</p>
        {farmer.district && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{farmer.district}</p>}
        {farmer.chicken_type && (
          <span className="mt-1.5 inline-block text-xs bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded capitalize">
            {farmer.chicken_type}
          </span>
        )}
        {farmer.assigned_vet && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Stethoscope size={10} /> {farmer.assigned_vet.name}
          </p>
        )}
      </div>

      {batches.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-50 text-xs text-gray-500 hover:text-gray-800 transition-colors">
            <span>Batches ({batches.length})</span>
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {open && batches.slice(0, 4).map((b, i) => (
            <div key={i} className="px-2.5 py-1.5 border-t border-gray-100 text-xs">
              <p className="text-gray-900 font-medium">{b.bird_type || b.batch_name || `Batch ${i + 1}`}</p>
              <p className="text-gray-400">{b.number_of_birds || b.quantity} birds · {b.age_weeks || b.age || '?'} wks</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SIGNUP_URL = 'https://smartvet.africa/login/farmer-signup/';

function openSignupPopup() {
  const w = 520, h = 720;
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
  const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
  window.open(SIGNUP_URL, 'smartvet_signup',
    `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1`);
}

export function CallerPanel({ activeCall, onFarmerSelect }) {
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(activeCall?.farmer || null);
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (activeCall?.farmer?.id) {
      setSelectedFarmer(activeCall.farmer);
      setMode('profile');
    } else {
      setMode('search');
      setSelectedFarmer(null);
    }
  }, [activeCall?.farmer?.id]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/farmers?search=${encodeURIComponent(query)}&limit=8`);
        setResults(data.farmers || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  function selectFarmer(farmer) {
    setSelectedFarmer(farmer);
    setMode('profile');
    setQuery('');
    setResults([]);
    onFarmerSelect?.(farmer);
  }

  async function refreshAndLink() {
    const phone = activeCall?.phone_number || activeCall?.farmer?.phone;
    if (!phone) return;
    setRefreshing(true);
    try {
      const { data } = await api.get(`/farmers?search=${encodeURIComponent(phone)}&limit=5`);
      const match = (data.farmers || []).find(f =>
        f.phone?.replace(/\D/g, '').endsWith(phone.replace(/\D/g, '').slice(-9))
      );
      if (match) selectFarmer(match);
      else { setQuery(phone); setMode('search'); }
    } catch {}
    setRefreshing(false);
  }

  if (!activeCall) return (
    <div className="p-3 text-xs text-gray-400 text-center">No active call</div>
  );

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Phone size={12} className="text-green-600 flex-shrink-0" />
        <span className="text-xs text-gray-800 font-mono truncate">{activeCall.phone_number || activeCall.farmer?.phone || 'Unknown'}</span>
        {activeCall.is_demo && <span className="text-xs text-amber-600 border border-amber-200 bg-amber-50 px-1.5 rounded">DEMO</span>}
      </div>

      {mode === 'search' && (
        <>
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertCircle size={11} /> Caller not linked to a farmer
          </p>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600" />
          </div>

          {searching && <p className="text-xs text-gray-400 text-center animate-pulse">Searching…</p>}

          {results.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {results.map(f => (
                <button key={f.id} onClick={() => selectFarmer(f)}
                  className="w-full text-left px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <p className="text-xs text-gray-900 font-semibold">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.phone}{f.district ? ` · ${f.district}` : ''}</p>
                </button>
              ))}
            </div>
          )}

          {!searching && query && results.length === 0 && (
            <p className="text-xs text-gray-400 text-center">No farmer found for "{query}"</p>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">New farmer?</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Register on SmartVet — data saves directly to the system. Come back and click <span className="text-gray-900 font-semibold">Find after registering</span>.
            </p>
            <button onClick={openSignupPopup}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors">
              <ExternalLink size={11} /> Open Registration Form
            </button>
            <button onClick={refreshAndLink} disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:text-gray-800 hover:border-gray-300 disabled:opacity-50 transition-colors">
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Searching…' : 'Find & link after registering'}
            </button>
          </div>
        </>
      )}

      {mode === 'profile' && selectedFarmer && (
        <>
          <button onClick={() => setMode('search')} className="text-xs text-gray-400 hover:text-green-700 transition-colors flex items-center gap-1">
            <Search size={10} /> Change farmer
          </button>
          <FarmerProfile farmer={selectedFarmer} />
          <OutreachPanel farmer={selectedFarmer} activeCall={activeCall} />
        </>
      )}

      {mode === 'search' && activeCall?.phone_number && (
        <OutreachPanel farmer={{ phone: activeCall.phone_number, name: 'Caller' }} activeCall={activeCall} />
      )}
    </div>
  );
}
