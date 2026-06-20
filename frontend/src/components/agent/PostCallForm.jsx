import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../shared/Button.jsx';
import { useCallStore } from '../../store/callStore.js';
import api from '../../services/api.js';

const OUTCOMES = [
  { value: 'resolved', label: '✅ Resolved on call' },
  { value: 'vet_requested', label: '🚑 Vet visit arranged' },
  { value: 'follow_up', label: '📞 Follow-up needed' },
  { value: 'no_action', label: '💬 No action required' },
  { value: 'transferred', label: '🔀 Transferred' },
];

export function PostCallForm({ lastCallId }) {
  const { postCallOpen, closePostCall } = useCallStore();
  const [form, setForm] = useState({ agent_notes: '', outcome: '', next_steps: '' });
  const [status, setStatus] = useState('idle');

  if (!postCallOpen || !lastCallId) return null;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.outcome) return;
    setStatus('loading');
    try {
      await api.post(`/calls/${lastCallId}/post-call`, form);
      setStatus('success');
      setTimeout(closePostCall, 1500);
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-8">
        <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 flex items-center gap-3 shadow-2xl">
          <CheckCircle size={24} className="text-green-400" />
          <span className="text-white font-medium">Call summary saved</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl w-full max-w-xl p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-4">📋 Post-Call Summary</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Call Outcome *</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o) => (
                <label key={o.value} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                  form.outcome === o.value ? 'border-green-500 bg-green-950/30 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}>
                  <input type="radio" name="outcome" value={o.value} onChange={set('outcome')} className="sr-only" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Agent Notes</label>
            <textarea value={form.agent_notes} onChange={set('agent_notes')} rows={2}
              placeholder="Key details from the call…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Next Steps</label>
            <input value={form.next_steps} onChange={set('next_steps')}
              placeholder="e.g. Vet to visit farm tomorrow morning"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500" />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={closePostCall}>Skip</Button>
            <Button type="submit" className="flex-1 flex items-center justify-center gap-2"
              disabled={!form.outcome || status === 'loading'}>
              {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save Summary'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
