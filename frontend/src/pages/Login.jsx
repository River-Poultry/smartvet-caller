import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try { await login(identifier, password); } catch { return; }
    const agent = JSON.parse(localStorage.getItem('sv_agent') || 'null');
    if (agent) navigate(agent.isAdmin ? '/admin' : '/agent');
  }

  return (
    <div className="min-h-screen flex bg-sv-bg">

      {/* Left — SmartVet green brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12"
           style={{ background: 'linear-gradient(150deg, #166534 0%, #15803d 50%, #16a34a 100%)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SmartVet" className="h-10 w-auto"
            onError={e => { e.currentTarget.src = '/logo.svg'; }} />
          <div>
            <p className="text-white font-bold text-base leading-none">SmartVet</p>
            <p className="text-green-200 text-xs leading-none mt-0.5">Call Centre</p>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-5">
            Every farmer.<br />Every flock.<br />Every call<br />matters.
          </h1>
          <p className="text-base text-green-100/80 leading-relaxed">
            AI-powered call centre for SmartVet agents — log symptoms, diagnose instantly, dispatch vets.
          </p>
        </div>

        <p className="text-xs text-green-200/50">River Poultry · SmartVet Africa</p>
      </div>

      {/* Right — Login form, white card like SmartVet signup */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 mb-8 lg:hidden">
            <img src="/logo.png" alt="SmartVet" className="h-14 w-auto"
              onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <p className="text-sv-green-dd font-extrabold text-xl tracking-tight">SmartVet Call Centre</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-extrabold text-sv-green-dd mb-1 tracking-tight">Sign in</h2>
            <p className="text-sv-text-muted text-sm mb-7">Access the agent dispatch portal</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-sv-green-dd mb-1.5">
                  Email or Phone
                </label>
                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-sv-green focus:ring-2 focus:ring-sv-green/20 transition-colors placeholder-gray-400"
                  placeholder="agent@smartvet.africa or +256…" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-sv-green-dd mb-1.5">
                  Password
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-sv-green focus:ring-2 focus:ring-sv-green/20 transition-colors placeholder-gray-400"
                  placeholder="••••••••" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm text-white bg-sv-green hover:bg-sv-green-d disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In →'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            River Poultry · SmartVet Africa · Powered by AI
          </p>
        </div>
      </div>
    </div>
  );
}
