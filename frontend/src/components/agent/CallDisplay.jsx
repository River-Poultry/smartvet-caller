import { useState } from 'react';
import { Phone, PhoneOff, Mic, Pause, AlertTriangle, UserPlus, RefreshCw, ExternalLink, FlaskConical } from 'lucide-react';
import { Badge } from '../shared/Badge.jsx';
import { useCallTimer } from '../../hooks/useCallTimer.js';
import { useCallStore } from '../../store/callStore.js';
import api from '../../services/api.js';

const SIGNUP_URL = 'https://smartvet.africa/login/farmer-signup/';

function openSignupPopup() {
  const w = 520, h = 720;
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
  const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
  window.open(SIGNUP_URL, 'smartvet_signup',
    `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1`);
}

export function CallDisplay({ onEnd }) {
  const { activeCall, openDispatchModal, setActiveCall } = useCallStore();
  const timer = useCallTimer(!!activeCall);
  const [showRegister, setShowRegister] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function refreshFarmer() {
    const phone = activeCall?.farmer?.phone || activeCall?.phone_number;
    if (!phone) return;
    setRefreshing(true);
    try {
      const { data } = await api.get(`/farmers?search=${encodeURIComponent(phone)}&limit=5`);
      const match = (data.farmers || []).find(f =>
        f.phone?.replace(/\D/g, '').endsWith(phone.replace(/\D/g, '').slice(-9))
      );
      if (match) setActiveCall({ ...activeCall, farmer: match });
    } catch {}
    setRefreshing(false);
    setShowRegister(false);
  }

  async function startDemo() {
    setDemoLoading(true);
    try {
      const { data } = await api.post('/calls/demo/start', {});
      setActiveCall({ ...data, is_demo: true });
    } catch (e) {
      alert('Could not start demo call: ' + (e.response?.data?.error || e.message));
    }
    setDemoLoading(false);
  }

  async function endCall() {
    if (activeCall?.is_demo) {
      await api.post('/calls/demo/end', {}).catch(() => {});
    }
    onEnd();
  }

  if (!activeCall) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-sv-bg-input border border-sv-border flex items-center justify-center">
          <Phone size={28} className="text-sv-text-muted opacity-50" />
        </div>
        <div>
          <p className="text-white font-medium">Waiting for call…</p>
          <p className="text-xs text-sv-text-muted mt-1">Status: Online</p>
        </div>
        <button onClick={startDemo} disabled={demoLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-sv-teal/40 text-sv-teal text-sm
                     hover:bg-sv-teal/10 transition-colors disabled:opacity-50 mt-2">
          <FlaskConical size={15} />
          {demoLoading ? 'Starting…' : 'Simulate Demo Call'}
        </button>
        <p className="text-xs text-sv-text-muted">Use demo call to test symptoms &amp; AI diagnosis</p>
      </div>
    );
  }

  const { farmer, is_emergency, is_demo } = activeCall;
  const isUnknown = !farmer?.id || farmer.id === 'null';

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Demo banner */}
      {is_demo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-sv-teal/10 border border-sv-teal/30 rounded-lg">
          <FlaskConical size={13} className="text-sv-teal" />
          <span className="text-xs text-sv-teal font-medium">Demo Mode — no real Twilio call</span>
        </div>
      )}

      {/* Unknown farmer warning */}
      {isUnknown && !showRegister && !is_demo && (
        <div className="rounded-xl p-3 border border-sv-amber/40 bg-sv-amber/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-sv-amber flex-shrink-0" />
            <span className="text-sm text-sv-amber font-medium">New Farmer — Not in system</span>
          </div>
          <button onClick={() => setShowRegister(true)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-sv-amber text-black font-semibold hover:bg-sv-amber-d transition-colors flex-shrink-0">
            <UserPlus size={12} /> Register
          </button>
        </div>
      )}

      {showRegister && (
        <div className="rounded-xl border border-sv-amber/40 bg-sv-amber/5 p-3 space-y-2.5">
          <p className="text-xs text-sv-amber font-semibold">Register on SmartVet</p>
          <p className="text-[11px] text-sv-text-muted leading-relaxed">
            Opens the official SmartVet registration form. After registering, click <span className="font-semibold">Find farmer</span> to link them to this call.
          </p>
          <button onClick={openSignupPopup}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-sv-green/10 border border-sv-green/40 text-sv-green text-xs font-bold hover:bg-sv-green/20 transition-colors">
            <ExternalLink size={11} /> Open SmartVet Registration
          </button>
          <button onClick={refreshFarmer} disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-sv-border text-sv-text-muted text-xs font-medium hover:text-white hover:border-sv-border-l disabled:opacity-50 transition-colors">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Searching…' : 'Find farmer after registering'}
          </button>
          <button onClick={() => setShowRegister(false)} className="w-full text-xs text-sv-text-muted hover:text-white transition-colors py-1">
            Cancel
          </button>
        </div>
      )}

      {/* Call card */}
      <div className={`rounded-xl p-4 border ${
        is_emergency
          ? 'border-sv-red/50 bg-sv-red/10'
          : 'border-sv-border bg-sv-bg-input'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${is_emergency ? 'bg-sv-red' : 'bg-sv-green'}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${is_emergency ? 'text-sv-red' : 'text-sv-green'}`}>
              {is_emergency ? 'EMERGENCY' : 'Active Call'}
            </span>
          </div>
          <span className="text-xl font-mono font-bold text-white">{timer}</span>
        </div>

        <p className="text-lg font-bold text-white">{farmer?.name || 'Unknown Caller'}</p>
        <p className="text-sm text-sv-text-muted mt-0.5">{farmer?.phone}</p>

        {farmer?.farms?.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {farmer.farms.map(f => (
              <p key={f.id} className="text-xs text-sv-green">🏡 {f.name}</p>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sv-bg-input border border-sv-border text-sv-text-muted hover:text-white hover:border-sv-border-l text-xs font-medium transition-colors">
          <Mic size={14} /> Mute
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sv-bg-input border border-sv-border text-sv-text-muted hover:text-white hover:border-sv-border-l text-xs font-medium transition-colors">
          <Pause size={14} /> Hold
        </button>
        <button onClick={endCall}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sv-red/15 border border-sv-red/40 text-sv-red hover:bg-sv-red hover:text-white text-xs font-semibold transition-colors">
          <PhoneOff size={14} /> End
        </button>
      </div>

      {/* Dispatch button */}
      <button
        onClick={() => openDispatchModal({ urgency: is_emergency ? 'emergency' : 'scheduled' })}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
          is_emergency
            ? 'bg-sv-red hover:bg-sv-red-d text-white shadow-[0_0_20px_rgba(224,32,32,0.3)]'
            : 'bg-sv-green hover:bg-sv-green-d text-white shadow-sv-glow'
        }`}>
        🚑 {is_emergency ? 'Emergency Vet Dispatch' : 'Request Vet Visit'}
      </button>
    </div>
  );
}
