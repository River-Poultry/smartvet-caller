import { useState } from 'react';
import { X, UserCheck, SkipForward } from 'lucide-react';
import { Button } from '../shared/Button.jsx';
import api from '../../services/api.js';

const BIRD_TYPES = ['broiler', 'layer', 'sasso', 'kuroiler', 'rainbow_rooster'];

export function UnknownFarmerPanel({ phone = '', onClose, onRegistered }) {
  const [form, setForm] = useState({
    name: '',
    phone: phone,
    farm_name: '',
    district: '',
    bird_type: 'broiler',
    flock_size: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.name || !form.phone) return setError('Name and phone are required');
    setLoading(true);
    setError(null);
    try {
      await api.post('/farmers', {
        name: form.name,
        phone: form.phone,
        district: form.district || undefined,
        notes: form.farm_name ? `Farm: ${form.farm_name}` : undefined,
      });
      onRegistered?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-amber-300">Quick Farmer Registration</h3>
        <button onClick={onClose} className="text-amber-600 hover:text-amber-300">
          <X size={16} />
        </button>
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-300 bg-red-950/40 border border-red-800 rounded px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-green-600 mb-1">Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              placeholder="Farmer name"
              className="w-full bg-[#132b18] border border-[#1e3a24] rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="block text-xs text-green-600 mb-1">Phone *</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} required
              placeholder="+256..."
              className="w-full bg-[#132b18] border border-[#1e3a24] rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-green-600 mb-1">Farm Name</label>
            <input value={form.farm_name} onChange={e => set('farm_name', e.target.value)}
              placeholder="Optional"
              className="w-full bg-[#132b18] border border-[#1e3a24] rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="block text-xs text-green-600 mb-1">District</label>
            <input value={form.district} onChange={e => set('district', e.target.value)}
              placeholder="e.g. Kampala"
              className="w-full bg-[#132b18] border border-[#1e3a24] rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-green-600 mb-1">Bird Type</label>
            <select value={form.bird_type} onChange={e => set('bird_type', e.target.value)}
              className="w-full bg-[#132b18] border border-[#1e3a24] rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-brand-green capitalize">
              {BIRD_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-green-600 mb-1">Flock Size</label>
            <input type="number" value={form.flock_size} onChange={e => set('flock_size', e.target.value)}
              placeholder="No. of birds"
              className="w-full bg-[#132b18] border border-[#1e3a24] rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-brand-green" />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" className="flex-1 flex items-center justify-center gap-1.5" disabled={loading}>
            <UserCheck size={14} />
            {loading ? 'Registering…' : 'Register & Continue Call'}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}
            className="flex items-center gap-1.5">
            <SkipForward size={14} /> Skip
          </Button>
        </div>
      </form>
    </div>
  );
}
