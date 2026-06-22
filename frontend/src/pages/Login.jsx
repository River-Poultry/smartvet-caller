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

      {/* Right — white form */}
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
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Sign in</h2>
            <p className="text-sm text-gray-500 mb-7">Access the agent dispatch portal</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email or Phone
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  autoFocus
                  placeholder="agent@smartvet.africa"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm
                             bg-white placeholder-gray-400
                             focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10
                             transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 text-sm
                             bg-white placeholder-gray-400
                             focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/10
                             transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                           font-bold text-sm text-white bg-green-700 hover:bg-green-800
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                  : 'Sign in →'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            SmartVet Africa · Powered by AI
          </p>
        </div>
      </div>
    </div>
  );
}
