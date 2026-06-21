import { useState, useEffect, useRef } from 'react';
import { Search, Phone, MapPin, ChevronDown, ChevronUp,
         AlertCircle, ExternalLink, RefreshCw, Stethoscope } from 'lucide-react';
import { useCallStore } from '../../store/callStore.js';
import { OutreachPanel } from './OutreachPanel.jsx';
import api from '../../services/api.js';

function FarmerProfile({ farmer }) {
  const [batches, setBatches] = useState([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!farmer?.django_id) return;
    api.get(`/farmers/${farmer.id}`).then(r => {
      setBatches(r.data.batches || []);
    }).catch(() => {});
  }, [farmer?.id]);

  if (!farmer) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="bg-sv-green/8 border border-sv-green/20 rounded-lg p-2.5">
        <p className="text-xs font-bold text-white truncate">{farmer.name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={10} />{farmer.phone}</p>
        {farmer.district && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} />{farmer.district}</p>}
        {farmer.chicken_type && (
          <span className="mt-1.5 inline-block text-xs bg-sv-teal/15 text-sv-teal border border-sv-teal/30 px-1.5 py-0.5 rounded capitalize">
            {farmer.chicken_type}
          </span>
        )}
        {farmer.assigned_vet && (
          <p className="text-xs text-sv-text-muted mt-1 flex items-center gap-1">
            <Stethoscope size={10} /> {farmer.assigned_vet.name}
          </p>
        )}
      </div>

      {batches.length > 0 && (
        <div className="border border-sv-border rounded-lg overflow-hidden">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-sv-bg-input text-xs text-gray-400 hover:text-white transition-colors">
            <span>Batches ({batches.length})</span>
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {open && batches.slice(0, 4).map((b, i) => (
            <div key={i} className="px-2.5 py-1.5 border-t border-sv-border/50 text-xs">
              <p className="text-white font-medium">{b.bird_type || b.batch_name || `Batch ${i+1}`}</p>
              <p className="text-gray-500">{b.number_of_birds || b.quantity} birds · {b.age_weeks || b.age || '?'} wks</p>
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
  window.open(
    SIGNUP_URL,
    'smartvet_signup',
    `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1`
  );
}

export function CallerPanel({ activeCall, onFarmerSelect }) {
  const [mode, setMode] = useState('search'); // 'search' | 'profile'
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
      if (match) {
        selectFarmer(match);
      } else {
        setQuery(phone);
        setMode('search');
      }
    } catch {}
    setRefreshing(false);
  }

  if (!activeCall) return (
    <div className="p-3 text-xs text-sv-text-muted text-center">No active call</div>
  );

  return (
    <div className="p-3 space-y-2">
      {/* Caller info bar */}
      <div className="flex items-center gap-2">
        <Phone size={12} className="text-sv-green flex-shrink-0" />
        <span className="text-xs text-white font-mono truncate">{activeCall.phone_number || activeCall.farmer?.phone || 'Unknown'}</span>
        {activeCall.is_demo && <span className="text-xs text-amber-400 border border-amber-700 px-1 rounded">DEMO</span>}
      </div>

      {mode === 'search' && (
        <>
          <p className="text-xs text-sv-amber flex items-center gap-1.5">
            <AlertCircle size={11} /> Caller not linked to a farmer
          </p>

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sv-text-muted" />
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green" />
          </div>

          {searching && <p className="text-xs text-sv-text-muted text-center animate-pulse">Searching…</p>}

          {results.length > 0 && (
            <div className="border border-sv-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {results.map(f => (
                <button key={f.id} onClick={() => selectFarmer(f)}
                  className="w-full text-left px-3 py-2 border-b border-sv-border/50 last:border-0 hover:bg-sv-bg-input transition-colors">
                  <p className="text-xs text-white font-semibold">{f.name}</p>
                  <p className="text-xs text-sv-text-muted">{f.phone}{f.district ? ` · ${f.district}` : ''}</p>
                </button>
              ))}
            </div>
          )}

          {!searching && query && results.length === 0 && (
            <p className="text-xs text-sv-text-muted text-center">No farmer found for "{query}"</p>
          )}

          {/* Register via SmartVet */}
          <div className="rounded-lg border border-sv-border bg-sv-bg/50 p-3 space-y-2.5">
            <p className="text-[10px] font-bold text-sv-text-muted uppercase tracking-widest">New farmer?</p>
            <p className="text-[11px] text-sv-text-muted leading-relaxed">
              Register on SmartVet — data saves directly to the system. Come back here and click <span className="text-white font-semibold">Find after registering</span>.
            </p>

            <button
              onClick={() => { openSignupPopup(); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-sv-green/10 border border-sv-green/40 text-sv-green text-xs font-bold hover:bg-sv-green/20 transition-colors">
              <ExternalLink size={11} /> Open Registration Form
            </button>

            <button
              onClick={refreshAndLink}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-sv-border text-sv-text-muted text-xs font-medium hover:text-white hover:border-sv-border-l disabled:opacity-50 transition-colors">
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Searching…' : 'Find & link after registering'}
            </button>
          </div>
        </>
      )}

      {mode === 'profile' && selectedFarmer && (
        <>
          <button onClick={() => setMode('search')} className="text-xs text-gray-500 hover:text-sv-green transition-colors flex items-center gap-1">
            <Search size={10} /> Change farmer
          </button>
          <FarmerProfile farmer={selectedFarmer} />
          <OutreachPanel farmer={selectedFarmer} activeCall={activeCall} />
        </>
      )}
    </div>
  );
}
