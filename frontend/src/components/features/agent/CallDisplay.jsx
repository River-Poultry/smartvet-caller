import { useState } from 'react';
import { Phone, PhoneOff, Mic, Pause, AlertTriangle, FlaskConical } from 'lucide-react';
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

  if (!activeCall) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
          <Phone size={24} className="text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Waiting for call…</p>
          <p className="text-xs text-gray-400 mt-1">Status: Online</p>
        </div>
        <button onClick={startDemo} disabled={demoLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-200 text-teal-600 text-sm hover:bg-teal-50 transition-colors disabled:opacity-50 mt-1">
          <FlaskConical size={14} />
          {demoLoading ? 'Starting…' : 'Simulate Demo Call'}
        </button>
        <p className="text-xs text-gray-400">Use demo call to test symptoms &amp; AI diagnosis</p>
      </div>
    );
  }

  const { farmer, is_emergency, is_demo } = activeCall;
  const isUnknown = !farmer?.id || farmer.id === 'null';

  return (
    <div className="flex flex-col gap-3 p-4">
      {is_demo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
          <FlaskConical size={13} className="text-teal-600" />
          <span className="text-xs text-teal-700 font-medium">Demo Mode — no real Twilio call</span>
        </div>
      )}

      {isUnknown && !is_demo && (
        <div className="rounded-xl p-3 border border-amber-200 bg-amber-50 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 font-medium">New farmer — use the sidebar to register</span>
        </div>
      )}

      <div className={`rounded-xl p-4 border ${
        is_emergency ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${is_emergency ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className={`text-xs font-bold uppercase tracking-wide ${is_emergency ? 'text-red-600' : 'text-green-700'}`}>
              {is_emergency ? 'EMERGENCY' : 'Active Call'}
            </span>
          </div>
          <span className="text-xl font-mono font-bold text-gray-900">{timer}</span>
        </div>

        <p className="text-base font-bold text-gray-900">{farmer?.name || 'Unknown Caller'}</p>
        <p className="text-sm text-gray-500 mt-0.5">{farmer?.phone}</p>

        {farmer?.farms?.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {farmer.farms.map(f => (
              <p key={f.id} className="text-xs text-green-700">🏡 {f.name}</p>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={toggleMute}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
            isMuted
              ? 'bg-amber-50 border-amber-200 text-amber-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}>
          <Mic size={13} /> {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={toggleHold}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
            isOnHold
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}>
          <Pause size={13} /> {isOnHold ? 'Resume' : 'Hold'}
        </button>
        <button onClick={endCall}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors">
          <PhoneOff size={13} /> End
        </button>
      </div>

      <button
        onClick={() => openDispatchModal({ urgency: is_emergency ? 'emergency' : 'scheduled' })}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
          is_emergency
            ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
            : 'bg-green-700 hover:bg-green-800 text-white shadow-sm'
        }`}>
        🚑 {is_emergency ? 'Emergency Vet Dispatch' : 'Request Vet Visit'}
      </button>
    </div>
  );
}
