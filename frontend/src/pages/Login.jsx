import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      <div className="w-full max-w-sm bg-white border border-amber-200 rounded-lg shadow-sm p-6">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h1 className="text-lg font-semibold text-brand-navy mb-1 text-center">Agent Sign In</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Sign in to access the call center console.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-md p-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
