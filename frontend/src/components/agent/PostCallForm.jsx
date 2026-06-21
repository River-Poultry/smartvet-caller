import { useState } from 'react';
import { CheckCircle, Loader2, Plus, X, Check, ClipboardList } from 'lucide-react';
import { useCallStore } from '../../store/callStore.js';
import api from '../../services/api.js';

const OUTCOMES = [
  { value: 'resolved',     label: 'Resolved on call',    icon: '✅' },
  { value: 'vet_requested', label: 'Vet visit arranged',  icon: '🚑' },
  { value: 'follow_up',    label: 'Follow-up needed',    icon: '📞' },
  { value: 'no_action',    label: 'No action required',  icon: '💬' },
  { value: 'transferred',  label: 'Transferred',          icon: '🔀' },
];

const SUGGESTED_ACTIONS = {
  resolved: [
    'Confirm farmer understood the treatment advice',
    'Send follow-up SMS with dosage instructions',
    'Schedule 48-hour check-in call',
  ],
  vet_requested: [
    'Confirm vet availability for the requested date',
    'Send farm GPS location to assigned vet',
    'Call farmer back to confirm visit time',
    'Log visit details in dispatch system',
    'Notify supervisor if emergency',
  ],
  follow_up: [
    'Schedule callback within 24–48 hours',
    'Note current flock condition for follow-up reference',
    'Alert supervisor if condition appears to be worsening',
  ],
  no_action: [
    'Document call reason and outcome',
    'Update farmer contact record if changed',
  ],
  transferred: [
    'Confirm receiving agent has full case context',
    'Log reason for transfer',
    'Notify farmer of the transfer',
  ],
};

function ActionItem({ action, onToggle, onRemove }) {
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
      action.done
        ? 'border-sv-green/30 bg-sv-green/5'
        : 'border-sv-border bg-sv-bg-input hover:border-sv-border-l'
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all ${
          action.done
            ? 'bg-sv-green border-sv-green'
            : 'border-sv-border hover:border-sv-green'
        }`}>
        {action.done && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>
      <span className={`flex-1 text-xs leading-relaxed ${action.done ? 'line-through text-sv-text-muted' : 'text-white'}`}>
        {action.text}
      </span>
      {action.custom && (
        <button type="button" onClick={onRemove} className="flex-shrink-0 text-sv-text-muted/50 hover:text-sv-red transition-colors mt-0.5">
          <X size={11} />
        </button>
      )}
    </div>
  );
}

export function PostCallForm({ lastCallId }) {
  const { postCallOpen, closePostCall } = useCallStore();
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [actions, setActions] = useState([]);
  const [newAction, setNewAction] = useState('');
  const [status, setStatus] = useState('idle');

  function selectOutcome(value) {
    setOutcome(value);
    const suggested = (SUGGESTED_ACTIONS[value] || []).map((text, i) => ({
      id: `suggested-${i}`,
      text,
      done: false,
      custom: false,
    }));
    // preserve any custom actions already added
    setActions(prev => [
      ...suggested,
      ...prev.filter(a => a.custom),
    ]);
  }

  function toggleAction(id) {
    setActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  }

  function removeAction(id) {
    setActions(prev => prev.filter(a => a.id !== id));
  }

  function addCustomAction(e) {
    e.preventDefault();
    const text = newAction.trim();
    if (!text) return;
    setActions(prev => [...prev, { id: `custom-${Date.now()}`, text, done: false, custom: true }]);
    setNewAction('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!outcome) return;
    setStatus('loading');

    const nextSteps = actions.length
      ? actions.map(a => `[${a.done ? 'x' : ' '}] ${a.text}`).join('\n')
      : '';

    try {
      await api.post(`/calls/${lastCallId}/post-call`, {
        outcome,
        agent_notes: notes,
        next_steps: nextSteps,
      });
      setStatus('success');
      setTimeout(() => {
        closePostCall();
        setOutcome('');
        setNotes('');
        setActions([]);
        setStatus('idle');
      }, 1500);
    } catch {
      setStatus('error');
    }
  }

  if (!postCallOpen || !lastCallId) return null;

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-sv-bg-card border border-sv-green/40 rounded-2xl px-8 py-6 flex items-center gap-4 shadow-2xl">
          <CheckCircle size={28} className="text-sv-green" />
          <div>
            <p className="text-white font-bold">Call summary saved</p>
            <p className="text-xs text-sv-text-muted mt-0.5">{actions.filter(a => a.done).length} of {actions.length} actions completed</p>
          </div>
        </div>
      </div>
    );
  }

  const doneCount = actions.filter(a => a.done).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-sv-bg-card border border-sv-border rounded-t-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sv-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ClipboardList size={16} className="text-sv-green" />
            <h3 className="text-sm font-bold text-gray-900">Post-Call Summary</h3>
          </div>
          <button onClick={closePostCall} className="text-sv-text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Outcome */}
            <div>
              <p className="text-[10px] font-bold text-sv-text-muted uppercase tracking-widest mb-2">Call Outcome *</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {OUTCOMES.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => selectOutcome(o.value)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium text-left transition-all ${
                      outcome === o.value
                        ? 'border-sv-green bg-sv-green/10 text-white'
                        : 'border-sv-border text-sv-text-muted hover:border-sv-border-l hover:text-white'
                    }`}>
                    <span>{o.icon}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Notes */}
            <div>
              <p className="text-[10px] font-bold text-sv-text-muted uppercase tracking-widest mb-2">Agent Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Key details from the call — flock size, farmer concerns, observations…"
                className="w-full bg-sv-bg-input border border-sv-border rounded-xl px-4 py-3 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green resize-none leading-relaxed transition-colors"
              />
            </div>

            {/* Action Points */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-sv-text-muted uppercase tracking-widest">
                  Action Points
                  {actions.length > 0 && (
                    <span className="ml-2 text-sv-green normal-case tracking-normal font-normal">
                      {doneCount}/{actions.length} done
                    </span>
                  )}
                </p>
              </div>

              {!outcome && (
                <p className="text-xs text-sv-text-muted py-3 text-center">
                  Select a call outcome above to get suggested action points
                </p>
              )}

              {actions.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {actions.map(action => (
                    <ActionItem
                      key={action.id}
                      action={action}
                      onToggle={() => toggleAction(action.id)}
                      onRemove={() => removeAction(action.id)}
                    />
                  ))}
                </div>
              )}

              {/* Add custom action */}
              {outcome && (
                <form onSubmit={addCustomAction} className="flex gap-2 mt-2">
                  <input
                    value={newAction}
                    onChange={e => setNewAction(e.target.value)}
                    placeholder="Add a custom action point…"
                    className="flex-1 bg-sv-bg-input border border-sv-border rounded-full px-4 py-2 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newAction.trim()}
                    className="px-3 py-2 bg-sv-green/10 border border-sv-green/40 text-sv-green rounded-full disabled:opacity-40 hover:bg-sv-green/20 transition-colors">
                    <Plus size={13} />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-sv-border flex items-center gap-3 flex-shrink-0 bg-sv-bg-card">
            {status === 'error' && (
              <p className="text-xs text-sv-red flex-1">Save failed — please try again</p>
            )}
            <button type="button" onClick={closePostCall}
              className="px-4 py-2 rounded-full border border-sv-border text-sv-text-muted text-xs hover:text-white transition-colors">
              Skip
            </button>
            <button
              type="submit"
              disabled={!outcome || status === 'loading'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-sv-green hover:bg-sv-green-d text-white font-bold text-xs uppercase tracking-widest disabled:opacity-40 transition-colors">
              {status === 'loading'
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : <><Check size={13} /> Save Summary</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
