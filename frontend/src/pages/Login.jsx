import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../services/api.js';

// ── Forgot / Reset password sub-flow ────────────────────────────────────────

function ForgotPassword({ onBack }) {
  const [step, setStep]         = useState('email');   // email | code | done
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
      <div className="text-center space-y-4">
        <CheckCircle size={40} className="text-green-600 mx-auto" />
        <p className="text-sm font-semibold text-gray-900">Password reset successfully</p>
        <p className="text-xs text-gray-500">You can now sign in with your new password.</p>
        <button onClick={onBack}
          className="w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-bold transition-colors">
          Back to Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 mb-4 inline-block transition-colors">
          ← Back to sign in
        </button>
        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {step === 'email' ? 'Reset password' : 'Enter reset code'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {step === 'email'
            ? 'Enter your email and we\'ll send a 6-digit reset code.'
            : `A 6-digit code was sent to ${email}. Enter it below with your new password.`}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus placeholder="agent@smartvet.africa"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900
                         focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 transition-colors" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                       font-bold text-sm text-white bg-green-700 hover:bg-green-800
                       disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Send reset code →'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitReset} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">6-digit code</label>
            <input type="text" inputMode="numeric" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required autoFocus placeholder="123456"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900
                         tracking-widest text-center focus:outline-none focus:border-green-600
                         focus:ring-2 focus:ring-green-600/10 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                required placeholder="Min 8 chars, 1 digit, 1 letter"
                className="w-full border border-gray-300 rounded-lg px-4 pr-10 py-2.5 text-sm text-gray-900
                           focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10 transition-colors" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                       font-bold text-sm text-white bg-green-700 hover:bg-green-800
                       disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Resetting…</> : 'Reset password →'}
          </button>
          <button type="button" onClick={() => { setStep('email'); setError(''); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
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
    if (agent) navigate(agent.isAdmin ? '/admin' : '/agent');
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — SmartVet green panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white"
        style={{ background: 'linear-gradient(150deg, #14532d 0%, #15803d 60%, #16a34a 100%)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SmartVet" className="h-10 w-auto"
            onError={e => { e.currentTarget.src = '/logo.svg'; }} />
          <div>
            <p className="font-extrabold text-lg leading-none">SmartVet</p>
            <p className="text-green-200 text-xs leading-none mt-0.5">Call Centre</p>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight mb-5">
            Every farmer.<br />Every flock.<br />Every call<br />matters.
          </h1>
          <p className="text-green-100/80 text-base leading-relaxed">
            AI-powered call centre for SmartVet agents — log symptoms, diagnose instantly, dispatch vets.
          </p>
        </div>

        <p className="text-green-200/50 text-xs">SmartVet Africa</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/logo.png" alt="SmartVet" className="h-10 w-auto"
              onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <div>
              <p className="font-extrabold text-gray-900 text-base leading-none">SmartVet</p>
              <p className="text-green-700 text-xs leading-none mt-0.5">Call Centre</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {forgot ? (
              <ForgotPassword onBack={() => setForgot(false)} />
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Sign in</h2>
                <p className="text-sm text-gray-500 mb-7">Access the agent dispatch portal</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email or Phone</label>
                    <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                      required autoFocus placeholder="agent@smartvet.africa"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm
                                 bg-white placeholder-gray-400
                                 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10
                                 transition-colors" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-gray-700">Password</label>
                      <button type="button" onClick={() => setForgot(true)}
                        className="text-xs text-green-700 hover:text-green-800 hover:underline transition-colors">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        required placeholder="••••••••"
                        className="w-full border border-gray-300 rounded-lg px-4 pr-10 py-2.5 text-gray-900 text-sm
                                   bg-white placeholder-gray-400
                                   focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10
                                   transition-colors" />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                               font-bold text-sm text-white bg-green-700 hover:bg-green-800
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {loading
                      ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
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
