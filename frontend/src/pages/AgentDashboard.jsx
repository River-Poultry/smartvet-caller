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
  { to: '/agent', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent/farmers', icon: Users, label: 'Farmers' },
  { to: '/agent/vets', icon: Stethoscope, label: 'Vets' },
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
    <div className="min-h-screen bg-sv-bg flex flex-col">
      {/* Top bar — River Poultry style */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-sv-border bg-sv-bg-card flex-shrink-0">
        <div className="flex items-center gap-5">
          <Link to="/agent" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/logo.png" alt="SmartVet" className="h-8 w-auto"
              onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <div className="leading-tight hidden sm:block">
              <p className="text-sm font-extrabold text-white leading-none tracking-tight">SmartVet</p>
              <p className="text-xs text-sv-teal leading-none mt-0.5">Call Centre</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? 'text-white bg-sv-green border border-sv-green'
                      : 'text-sv-text-muted hover:text-white hover:bg-sv-bg-input border border-transparent'
                  }`}>
                  <Icon size={11} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {activeCall && (
            <span className="flex items-center gap-1.5 text-xs text-sv-red border border-sv-red/50 bg-sv-red/10 px-3 py-1 rounded-full animate-pulse font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-sv-red" />
              Live Call
            </span>
          )}
          <ThemeToggle />
          <Badge variant={STATUS_COLOR[agent?.status] || 'gray'} className="capitalize text-xs rounded-full">
            {agent?.status?.replace('_', ' ')}
          </Badge>
          <span className="text-sm font-semibold text-white hidden sm:inline">{agent?.name}</span>
          <button onClick={logout} title="Logout"
            className="text-sv-text-muted hover:text-sv-red transition-colors p-1 rounded-full">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main layout — 3 columns with collapsible transcript */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — call info + caller panel (fixed narrow) */}
        <div className="w-64 flex-shrink-0 border-r border-sv-border bg-sv-bg-card flex flex-col overflow-y-auto">
          <CallDisplay onEnd={clearCall} />
          <div className="border-t border-sv-border flex-1 overflow-y-auto">
            <CallerPanel
              activeCall={activeCall}
              onFarmerSelect={(farmer) => {
                // Update the active call with the selected farmer
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
        <div className={`flex flex-col border-r border-sv-border bg-sv-bg transition-all duration-200 ${
          transcriptOpen ? 'w-64 flex-shrink-0' : 'w-8 flex-shrink-0'
        }`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-sv-border flex-shrink-0">
            {transcriptOpen && (
              <span className="text-xs font-medium text-gray-400 truncate">Live Transcript</span>
            )}
            <button onClick={() => setTranscriptOpen(o => !o)}
              className="text-gray-500 hover:text-white transition-colors flex-shrink-0 ml-auto"
              title={transcriptOpen ? 'Collapse transcript' : 'Expand transcript'}>
              {transcriptOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
          {transcriptOpen && (
            <div className="flex-1 overflow-hidden">
              <RealTimeTranscript compact />
            </div>
          )}
        </div>

        {/* Right — Call Companion (takes remaining space) */}
        <div className="flex-1 min-w-0 flex flex-col bg-sv-bg-card overflow-hidden">
          <CallCompanion />
        </div>
      </div>

      <VetDispatchModal />
      <PostCallForm lastCallId={lastCallId.current} />
    </div>
  );
}
