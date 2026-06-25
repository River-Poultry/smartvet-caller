import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Loader2, Eye, EyeOff, CheckCircle, Zap, Users, Stethoscope, Activity } from 'lucide-react';
import api from '../services/api.js';

const FEATURES = [
  { icon: Zap,         text: 'AI diagnosis in under 2 seconds'              },
  { icon: Stethoscope, text: 'Instant vet dispatch to the field'             },
  { icon: Users,       text: 'Full farmer & flock history on every call'     },
  { icon: Activity,    text: 'Live call transcription & real-time guidance'  },
];

// ── Forgot / Reset password sub-flow ────────────────────────────────────────

function ForgotPassword({ onBack }) {
  const [step, setStep]         = useState('email');
  const [email, setEmail]       = useState('');
  const [agentId, setAgentId]   = useState('');
  const [code, setCode]         = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function sendCode(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setAgentId(data.agentId || '');
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  }

  async function submitReset(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { agentId, code, newPassword: password });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code');
    } finally { setLoading(false); }
  }

  if (step === 'done') {
    return (
      <div className="text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">Password updated</p>
          <p className="text-sm text-gray-500 mt-1">You can now sign in with your new password.</p>
        </div>
        <button onClick={onBack}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-green-700 hover:bg-green-600
                     shadow-[0_2px_8px_rgba(21,128,61,0.3)] transition-all">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-600 mb-5 inline-flex items-center gap-1 transition-colors">
          ← Back to sign in
        </button>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          {step === 'email' ? 'Reset your password' : 'Check your email'}
        </h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          {step === 'email'
            ? "Enter your email and we'll send a 6-digit reset code."
            : `We sent a code to ${email}. Enter it below with your new password.`}
        </p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus placeholder="agent@smartvet.africa"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900
                         focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                       text-white bg-green-700 hover:bg-green-600 shadow-[0_2px_8px_rgba(21,128,61,0.3)]
                       disabled:opacity-50 transition-all">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : 'Send reset code →'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">6-digit code</label>
            <input type="text" inputMode="numeric" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required autoFocus placeholder="123456"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900
                         tracking-[0.4em] text-center font-mono focus:outline-none focus:border-green-600
                         focus:ring-2 focus:ring-green-600/10 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                required placeholder="Min 8 chars, 1 digit, 1 letter"
                className="w-full border border-gray-200 rounded-xl px-4 pr-11 py-3 text-sm text-gray-900
                           focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 transition-all" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                       text-white bg-green-700 hover:bg-green-600 shadow-[0_2px_8px_rgba(21,128,61,0.3)]
                       disabled:opacity-50 transition-all">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Resetting…</> : 'Set new password →'}
          </button>
          <button type="button" onClick={() => { setStep('email'); setError(''); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
            Didn't receive a code? Resend
          </button>
        </form>
      )}
    </div>
  );
}

// ── Main Login page ──────────────────────────────────────────────────────────

export default function Login() {
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [forgot, setForgot]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try { await login(identifier, password); } catch { return; }
    const agent = JSON.parse(localStorage.getItem('sv_agent') || 'null');
    if (agent) navigate(agent.isAdmin ? '/admin' : agent.isVetBoard ? '/vet-board' : '/agent');
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand showcase ── */}
      <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #071a0e 0%, #0a2015 45%, #0c2a1a 100%)' }}>

        {/* Dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.18]"
          style={{ backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Green glow — upper right */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.10) 0%, transparent 65%)' }} />

        {/* Green glow — lower left */}
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 65%)' }} />

        <div className="relative z-10 flex flex-col h-full p-12 xl:p-14">

          {/* Wordmark — logo + text inline */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <img src="/logo.png" alt="SmartVet"
              className="h-11 w-auto drop-shadow-lg"
              onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <div>
              <p className="text-xl font-bold text-white tracking-tight leading-none">SmartVet</p>
              <p className="text-xs text-green-400 font-semibold tracking-widest uppercase mt-1">Call Centre</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="flex-1 flex items-center">
            <div>
              <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-tight tracking-tight">
                Every farmer.<br />
                Every flock.<br />
                Every call<br />
                <span className="text-green-400">matters.</span>
              </h1>
              <p className="mt-5 text-base text-white/50 leading-relaxed max-w-sm">
                AI-powered call centre for SmartVet agents — log symptoms, diagnose instantly, dispatch vets.
              </p>

              {/* Feature pills — frosted glass */}
              <div className="mt-10 flex flex-wrap gap-2">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <span key={text}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70
                               bg-white/8 border border-white/12 px-3 py-1.5 rounded-full backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.10)' }}>
                    <Icon size={11} className="text-green-400 flex-shrink-0" />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="flex-shrink-0 text-xs text-white/25 tracking-wide">© SmartVet Africa</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 bg-white border-l border-gray-100">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <img src="/logo.png" alt="SmartVet" className="h-12 w-auto"
              onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <div>
              <p className="font-bold text-gray-900 text-lg leading-none">SmartVet</p>
              <p className="text-green-700 text-xs font-semibold leading-none mt-1.5 uppercase tracking-widest">Call Centre</p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.08)]">
            {forgot ? (
              <ForgotPassword onBack={() => setForgot(false)} />
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
                  <p className="text-sm text-gray-500 mt-1">Sign in to the agent portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or Phone</label>
                    <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                      required autoFocus placeholder="agent@smartvet.africa"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm
                                 placeholder-gray-400 focus:outline-none focus:border-green-600
                                 focus:ring-2 focus:ring-green-600/10 transition-all" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <button type="button" onClick={() => setForgot(true)}
                        className="text-xs text-green-700 hover:text-green-800 font-medium transition-colors">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        required placeholder="••••••••"
                        className="w-full border border-gray-200 rounded-xl px-4 pr-11 py-3 text-gray-900 text-sm
                                   placeholder-gray-400 focus:outline-none focus:border-green-600
                                   focus:ring-2 focus:ring-green-600/10 transition-all" />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                               text-white bg-green-700 hover:bg-green-600
                               shadow-[0_2px_8px_rgba(21,128,61,0.3)] hover:shadow-[0_4px_16px_rgba(21,128,61,0.4)]
                               disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {loading
                      ? <><Loader2 size={14} className="animate-spin" /> Signing in…</>
                      : 'Sign in →'}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            SmartVet Africa · Powered by AI
          </p>
        </div>
      </div>
    </div>
  );
}
