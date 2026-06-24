import { useEffect, useRef, useState } from 'react';
import { LogOut, Users, Stethoscope, LayoutDashboard, ChevronLeft, ChevronRight, Phone, Brain, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useCallStore } from '../store/callStore.js';
import { CallDisplay } from '../components/features/agent/CallDisplay.jsx';
import { CallerPanel } from '../components/features/agent/CallerPanel.jsx';
import { RealTimeTranscript } from '../components/features/agent/RealTimeTranscript.jsx';
import { CallCompanion } from '../components/features/agent/CallCompanion.jsx';
import { VetDispatchModal } from '../components/features/agent/VetDispatchModal.jsx';
import { PostCallForm } from '../components/features/agent/PostCallForm.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ThemeToggle } from '../components/ui/ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/agent',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent/farmers',  icon: Users,           label: 'Farmers'   },
  { to: '/agent/vets',     icon: Stethoscope,     label: 'Vets'      },
];

const MOBILE_TABS = [
  { id: 'call',       icon: Phone,      label: 'Call'       },
  { id: 'caller',     icon: Users,      label: 'Caller'     },
  { id: 'diagnosis',  icon: Brain,      label: 'Diagnosis'  },
  { id: 'transcript', icon: FileText,   label: 'Transcript' },
];

const STATUS_COLOR = { online: 'green', on_call: 'red', on_break: 'yellow', offline: 'gray' };

export default function AgentDashboard() {
  const { agent, logout } = useAuthStore();
  const { activeCall, fetchActiveCall, clearCall } = useCallStore();
  const lastCallId = useRef(null);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState('call');
  const location = useLocation();

  useEffect(() => { fetchActiveCall(); }, []);
  useEffect(() => {
    if (activeCall?.call_id) lastCallId.current = activeCall.call_id;
  }, [activeCall?.call_id]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)', boxShadow: '0 2px 12px rgba(15,23,42,0.22)' }}>
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5">
          <div className="flex items-center gap-2 sm:gap-5">
            <Link to="/agent" className="flex items-center gap-2 flex-shrink-0">
              <img src="/logo.png" alt="SmartVet" className="h-7 sm:h-8 w-auto brightness-0 invert"
                onError={e => { e.currentTarget.src = '/logo.svg'; }} />
              <div className="leading-tight hidden sm:block">
                <p className="text-sm font-black text-white leading-tight">SmartVet</p>
                <p className="text-[11px] text-green-300 leading-none mt-0.5">Call Centre</p>
              </div>
            </Link>

            <div className="h-7 w-px bg-white/20 hidden sm:block" />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const active = location.pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      active
                        ? 'bg-white text-green-800 shadow-sm'
                        : 'text-green-100 hover:bg-white/15 hover:text-white'
                    }`}>
                    <Icon size={13} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile nav icons */}
            <nav className="flex md:hidden items-center gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const active = location.pathname === to;
                return (
                  <Link key={to} to={to} title={label}
                    className={`p-2 rounded-lg transition-all ${
                      active ? 'bg-white text-green-800' : 'text-green-200 hover:bg-white/15'
                    }`}>
                    <Icon size={16} />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeCall && (
              <span className="flex items-center gap-1 sm:gap-1.5 text-xs text-white border border-red-400/60 bg-red-500/80 px-2 sm:px-3 py-1 rounded-full animate-pulse font-bold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="hidden xs:inline">Live </span>Call
              </span>
            )}
            <ThemeToggle />
            <Badge variant={STATUS_COLOR[agent?.status] || 'gray'} className="capitalize hidden sm:inline-flex">
              {agent?.status?.replace('_', ' ')}
            </Badge>
            <span className="text-sm font-semibold text-green-100 hidden lg:inline">{agent?.name}</span>
            <button onClick={logout} title="Logout" aria-label="Logout"
              className="text-green-200 hover:text-red-300 transition-all p-1.5 rounded-lg hover:bg-white/10 min-h-[36px] min-w-[36px]">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Desktop layout (md+): 3-column ── */}
      <div className="hidden md:flex flex-1 overflow-hidden mx-3 lg:mx-5 mb-5 gap-3">

        {/* Left — call info + caller panel */}
        <div className="w-56 lg:w-64 flex-shrink-0 border border-gray-200 bg-white flex flex-col overflow-y-auto rounded-xl shadow-sm">
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
        <div className={`hidden lg:flex flex-col border border-gray-200 bg-gray-50 rounded-xl shadow-sm transition-all duration-200 ${
          transcriptOpen ? 'w-64 flex-shrink-0' : 'w-10 flex-shrink-0'
        }`}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 flex-shrink-0">
            <button onClick={() => setTranscriptOpen(o => !o)}
              className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 ml-auto min-h-[36px] min-w-[36px]"
              aria-label={transcriptOpen ? 'Collapse transcript' : 'Expand transcript'}>
              {transcriptOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
          {transcriptOpen && (
            <div className="flex-1 overflow-hidden">
              <RealTimeTranscript />
            </div>
          )}
        </div>

        {/* Right — Call Companion */}
        <div className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <CallCompanion />
        </div>
      </div>

      {/* ── Mobile layout (<md): tab-based ── */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">
        {/* Tab content */}
        <div className="flex-1 overflow-y-auto bg-white mx-3 mt-3 mb-1 rounded-xl border border-gray-200 shadow-sm">
          {mobileTab === 'call' && (
            <CallDisplay onEnd={clearCall} />
          )}
          {mobileTab === 'caller' && (
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
          )}
          {mobileTab === 'diagnosis' && (
            <CallCompanion />
          )}
          {mobileTab === 'transcript' && (
            <RealTimeTranscript />
          )}
        </div>

        {/* Mobile bottom tab bar */}
        <nav className="flex-shrink-0 flex items-center justify-around bg-white border-t border-gray-200 px-2 py-2 mx-3 mb-3 rounded-xl shadow-sm">
          {MOBILE_TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setMobileTab(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors flex-1 ${
                mobileTab === id
                  ? 'bg-green-700 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}>
              <Icon size={18} />
              <span className="text-xs font-semibold leading-none">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <VetDispatchModal />
      <PostCallForm lastCallId={lastCallId.current} />
    </div>
  );
}
