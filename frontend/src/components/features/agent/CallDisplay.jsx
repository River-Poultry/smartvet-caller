import { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, AlertTriangle, FlaskConical, MapPin } from 'lucide-react';
import { Badge } from '../../ui/Badge.jsx';
import { useCallTimer } from '../../../hooks/useCallTimer.js';
import { useCallStore } from '../../../store/callStore.js';
import api from '../../../services/api.js';

export function CallDisplay({ onEnd }) {
  const { activeCall, isMuted, isOnHold, toggleMute, toggleHold, openDispatchModal, setActiveCall } = useCallStore();
  const timer = useCallTimer(!!activeCall, isOnHold);
  const [demoLoading, setDemoLoading] = useState(false);

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
    if (activeCall?.is_demo) await api.post('/calls/demo/end', {}).catch(() => {});
    onEnd();
  }

  /* ── Idle / waiting state ── */
  if (!activeCall) {
    return (
      <div className="flex flex-col items-center justify-start gap-5 p-6 pt-4 text-center">
        {/* Ready indicator */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shadow-sm">
            <Phone size={32} className="text-green-700" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white" />
        </div>

        <div className="space-y-1">
          <p className="text-base font-bold text-slate-900">Ready to receive calls</p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>

        <div className="w-full border-t border-slate-100 pt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Testing</p>
          <button
            onClick={startDemo}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-teal-300 text-teal-700 text-sm font-semibold hover:bg-teal-50 hover:border-teal-400 transition-all disabled:opacity-50"
          >
            <FlaskConical size={15} />
            {demoLoading ? 'Starting demo…' : 'Simulate Demo Call'}
          </button>
          <p className="text-xs text-slate-400">Simulates incoming call · no Twilio charges</p>
        </div>
      </div>
    );
  }

  /* ── Active call ── */
  const { farmer, is_emergency, is_demo } = activeCall;
  const isUnknown = !farmer?.id || farmer.id === 'null';

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Demo banner */}
      {is_demo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
          <FlaskConical size={13} className="text-teal-600 flex-shrink-0" />
          <span className="text-xs text-teal-700 font-semibold">Demo Mode — no real Twilio call</span>
        </div>
      )}

      {/* Unknown caller warning */}
      {isUnknown && !is_demo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-800 font-semibold">New farmer — register via sidebar</span>
        </div>
      )}

      {/* Caller card */}
      <div className={`rounded-2xl border-2 p-4 ${
        is_emergency
          ? 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50'
          : 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
      }`}>
        {/* Status bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${is_emergency ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className={`text-xs font-black uppercase tracking-widest ${is_emergency ? 'text-red-600' : 'text-green-700'}`}>
              {is_emergency ? '⚠ Emergency' : 'Active Call'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-mono font-black text-slate-900 tabular-nums tracking-tight">
              {timer}
            </span>
          </div>
        </div>

        {/* Caller info */}
        <div className="space-y-1">
          <p className="text-lg font-black text-slate-900 leading-tight">
            {farmer?.name || 'Unknown Caller'}
          </p>
          {farmer?.phone && (
            <p className="text-sm font-semibold text-slate-500 font-mono">{farmer.phone}</p>
          )}
          {farmer?.farms?.length > 0 && (
            <div className="mt-2 space-y-1 pt-2 border-t border-white/60">
              {farmer.farms.map(f => (
                <div key={f.id} className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-green-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-green-800">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Call controls */}
      <div className="grid grid-cols-3 gap-2">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 font-bold text-xs transition-all ${
            isMuted
              ? 'bg-amber-500 border-amber-400 text-white shadow-[0_2px_8px_rgba(217,119,6,0.4)]'
              : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50'
          }`}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Hold */}
        <button
          onClick={toggleHold}
          className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 font-bold text-xs transition-all ${
            isOnHold
              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_2px_8px_rgba(37,99,235,0.4)]'
              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          {isOnHold ? <Play size={18} /> : <Pause size={18} />}
          <span>{isOnHold ? 'Resume' : 'Hold'}</span>
        </button>

        {/* End call */}
        <button
          onClick={endCall}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 bg-red-600 border-red-500 text-white font-bold text-xs shadow-[0_2px_8px_rgba(220,38,38,0.4)] hover:bg-red-700 hover:shadow-[0_4px_16px_rgba(220,38,38,0.5)] transition-all"
        >
          <PhoneOff size={18} />
          <span>End</span>
        </button>
      </div>

      {/* Dispatch CTA */}
      <button
        onClick={() => openDispatchModal({ urgency: is_emergency ? 'emergency' : 'scheduled' })}
        className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all ${
          is_emergency
            ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_16px_rgba(220,38,38,0.4)]'
            : 'bg-green-700 hover:bg-green-600 text-white shadow-[0_4px_16px_rgba(21,128,61,0.4)]'
        }`}
      >
        <span className="text-base">🚑</span>
        {is_emergency ? 'Emergency Vet Dispatch' : 'Request Vet Visit'}
      </button>
    </div>
  );
}
