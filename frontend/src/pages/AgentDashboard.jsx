import { useEffect, useRef, useState } from 'react';
import { LogOut, Users, Stethoscope, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useCallStore } from '../store/callStore.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { CallDisplay } from '../components/agent/CallDisplay.jsx';
import { CallerPanel } from '../components/agent/CallerPanel.jsx';
import { RealTimeTranscript } from '../components/agent/RealTimeTranscript.jsx';
import { CallCompanion } from '../components/agent/CallCompanion.jsx';
import { VetDispatchModal } from '../components/agent/VetDispatchModal.jsx';
import { PostCallForm } from '../components/agent/PostCallForm.jsx';
import { Badge } from '../components/shared/Badge.jsx';
import { ThemeToggle } from '../components/shared/ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/agent',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent/farmers',  icon: Users,           label: 'Farmers'   },
  { to: '/agent/vets',     icon: Stethoscope,     label: 'Vets'      },
];

const STATUS_COLOR = { online: 'green', on_call: 'red', on_break: 'yellow', offline: 'gray' };

export default function AgentDashboard() {
  const { agent, logout } = useAuthStore();
  const { activeCall, fetchActiveCall, clearCall } = useCallStore();
  const lastCallId = useRef(null);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const location = useLocation();

  useWebSocket();
  useEffect(() => { fetchActiveCall(); }, []);
  useEffect(() => {
    if (activeCall?.call_id) lastCallId.current = activeCall.call_id;
  }, [activeCall?.call_id]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-5">
          <Link to="/agent" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/logo.png" alt="SmartVet" className="h-8 w-auto"
              onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <div className="leading-tight hidden sm:block">
              <p className="text-sm font-extrabold text-gray-900 leading-none">SmartVet</p>
              <p className="text-xs text-green-700 leading-none mt-0.5">Call Centre</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-green-700 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  <Icon size={12} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {activeCall && (
            <span className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-1 rounded-full animate-pulse font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Live Call
            </span>
          )}
          <ThemeToggle />
          <Badge variant={STATUS_COLOR[agent?.status] || 'gray'} className="capitalize">
            {agent?.status?.replace('_', ' ')}
          </Badge>
          <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{agent?.name}</span>
          <button onClick={logout} title="Logout"
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — call info + caller panel */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
          <CallDisplay onEnd={clearCall} />
          <div className="border-t border-gray-200 flex-1 overflow-y-auto">
            <CallerPanel
              activeCall={activeCall}
              onFarmerSelect={(farmer) => {
                if (activeCall) {
                  useCallStore.setState(s => ({
                    activeCall: { ...s.activeCall, farmer }
                  }));
                }
              }}
            />
          </div>
        </div>

        {/* Center — collapsible transcript */}
        <div className={`flex flex-col border-r border-gray-200 bg-gray-50 transition-all duration-200 ${
          transcriptOpen ? 'w-64 flex-shrink-0' : 'w-8 flex-shrink-0'
        }`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
            {transcriptOpen && (
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">Live Transcript</span>
            )}
            <button onClick={() => setTranscriptOpen(o => !o)}
              className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 ml-auto"
              title={transcriptOpen ? 'Collapse' : 'Expand'}>
              {transcriptOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
          {transcriptOpen && (
            <div className="flex-1 overflow-hidden">
              <RealTimeTranscript compact />
            </div>
          )}
        </div>

        {/* Right — Call Companion */}
        <div className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
          <CallCompanion />
        </div>
      </div>

      <VetDispatchModal />
      <PostCallForm lastCallId={lastCallId.current} />
    </div>
  );
}
