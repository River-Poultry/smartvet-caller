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
      {/* Left — River Poultry brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
           style={{ background: 'linear-gradient(160deg, #1d2a10 0%, #141c0a 60%, #0e1508 100%)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SmartVet" className="h-10 w-auto"
            onError={e => { e.currentTarget.src = '/logo.svg'; }} />
          <div>
            <p className="text-white font-bold text-base leading-none">SmartVet</p>
            <p className="text-sv-teal text-xs leading-none mt-0.5">Call Centre</p>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Transforming<br />African Poultry
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-2">
            Through connected farms, AI-powered food safety, and on-demand veterinary support
          </p>
          <p className="text-sm text-sv-green font-medium">
            Every farmer. Every flock. Every call — matters.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-white/30">
          <span>riverpoultry.com</span>
          <span>·</span>
          <span>SmartVet Africa</span>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/logo.png" alt="SmartVet" className="h-10 w-auto"
              onError={e => { e.currentTarget.src = '/logo.svg'; }} />
            <div>
              <p className="text-white font-bold text-base leading-none">SmartVet</p>
              <p className="text-sv-teal text-xs leading-none mt-0.5">Call Centre</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">Sign In</h2>
          <p className="text-sv-text-muted text-sm mb-8">Log in to access the dispatch portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-sv-red/10 border border-sv-red/40 text-red-300 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-sv-text-muted uppercase tracking-wider mb-2">
                Email or Phone
              </label>
              <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required
                autoFocus
                className="w-full bg-sv-bg-input border border-sv-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sv-green focus:ring-1 focus:ring-sv-green/20 transition-colors placeholder-sv-text-muted"
                placeholder="agent@smartvet.africa or +256…" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-sv-text-muted uppercase tracking-wider mb-2">
                Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-sv-bg-input border border-sv-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sv-green focus:ring-1 focus:ring-sv-green/20 transition-colors placeholder-sv-text-muted"
                placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm uppercase tracking-widest text-white transition-all border border-sv-green bg-sv-green hover:bg-sv-green-d disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-xs text-sv-text-muted mt-8">
            River Poultry · SmartVet Africa · Powered by AI
          </p>
        </div>
      </div>
    </div>
  );
}
