import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, Star, AlertTriangle } from 'lucide-react';
import { useCallStore } from '../../store/callStore.js';
import api from '../../services/api.js';

const VISIT_TYPES = [
  'Emergency diagnosis',
  'Routine vaccination',
  'Post-treatment follow-up',
  'Routine farm inspection',
  'Disease outbreak response',
];

const ANIMAL_TYPES = ['Broilers', 'Layers', 'Chicks', 'Sasso / Local', 'Mixed poultry'];

export function VetDispatchModal() {
  const { activeCall, dispatchModalOpen, closeDispatchModal, symptoms, callNotes, dispatchUrgency } = useCallStore();

  // Build rich context for the vet from symptoms + notes + call
  function buildVetContext() {
    const parts = [];
    if (symptoms?.length) {
      parts.push(`Symptoms: ${symptoms.map(s => `${s.symptom} (${s.severity})`).join(', ')}`);
    }
    if (callNotes?.trim()) {
      parts.push(`Agent notes:\n${callNotes.trim()}`);
    }
    return parts.join('\n\n');
  }

  const [form, setForm] = useState({
    urgency_level: dispatchUrgency || 'scheduled',
    visit_type: '',
    symptoms_description: buildVetContext(),
    animal_type: activeCall?.farmer?.chicken_type || '',
    animal_count: '',
    requested_date: '',
    requested_time_window: 'morning',
    location_address: '',
  });
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [availableVets, setAvailableVets] = useState([]);
  const [selectedVetId, setSelectedVetId] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (!dispatchModalOpen) return;
    setStatus('idle');
    setResult(null);
    setError('');
    setSelectedVetId('');
    setForm(f => ({
      ...f,
      urgency_level: dispatchUrgency || 'scheduled',
      symptoms_description: buildVetContext(),
      animal_type: activeCall?.farmer?.chicken_type || f.animal_type,
    }));
    api.get('/vets?available=true&limit=6').then(r => setAvailableVets(r.data.vets || [])).catch(() => {});
  }, [dispatchModalOpen]);

  if (!dispatchModalOpen) return null;

  const set_ = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.visit_type) { setError('Please select a visit type'); return; }
    setStatus('loading');
    setError('');

    try {
      const { data } = await api.post('/vet-dispatch', {
        call_id: activeCall?.call_id,
        farmer_id: activeCall?.farmer?.id || 'walk-in',
        farmer_name: activeCall?.farmer?.name,
        farmer_phone: activeCall?.farmer?.phone,
        farm_id: activeCall?.farmer?.farms?.[0]?.id,
        farm_name: activeCall?.farmer?.farms?.[0]?.name,
        location_lat: activeCall?.farmer?.farms?.[0]?.location?.lat,
        location_lng: activeCall?.farmer?.farms?.[0]?.location?.lng,
        ...form,
        animal_count: form.animal_count ? parseInt(form.animal_count) : null,
      });

      if (selectedVetId && data.dispatch_id) {
        await api.post(`/vets/dispatch/${data.dispatch_id}/assign`, { vet_id: selectedVetId }).catch(() => {});
      }
      setResult(data);
      setStatus('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create dispatch. Try again.');
      setStatus('error');
    }
  }

  const isEmergency = form.urgency_level === 'emergency';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-sv-bg-card border border-gray-200 dark:border-sv-border rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isEmergency
            ? 'border-red-200 dark:border-sv-red/30 bg-red-50 dark:bg-sv-red/10'
            : 'border-gray-200 dark:border-sv-border'
        } rounded-t-2xl`}>
          <div className="flex items-center gap-2.5">
            {isEmergency && <AlertTriangle size={18} className="text-sv-red" />}
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {isEmergency ? '🚨 Emergency Dispatch' : '🚑 Vet Dispatch Request'}
            </h2>
          </div>
          <button onClick={closeDispatchModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center">
            <CheckCircle size={48} className="text-sv-green mx-auto mb-3" />
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">Dispatch Created!</p>
            {result?.paravet_assigned ? (
              <p className="text-gray-500 dark:text-gray-300 text-sm">
                <strong>{result.paravet_assigned.name}</strong> assigned.
                {result.paravet_assigned.eta_minutes && ` ETA: ${result.paravet_assigned.eta_minutes} min`}
              </p>
            ) : (
              <p className="text-gray-400 text-sm mt-1">Pending vet assignment — admin will be notified.</p>
            )}
            <button onClick={closeDispatchModal}
              className="mt-5 px-6 py-2 bg-sv-green hover:bg-sv-green-d text-white rounded-lg font-medium transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">

            {/* Farmer info */}
            {activeCall?.farmer?.name && (
              <div className="bg-sv-green/8 dark:bg-sv-green/10 border border-sv-green/20 rounded-lg px-3 py-2.5 text-sm">
                <p className="text-xs text-sv-green font-medium mb-0.5">Caller</p>
                <p className="font-semibold text-gray-900 dark:text-white">{activeCall.farmer.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{activeCall.farmer.phone}</p>
              </div>
            )}

            {/* Urgency */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-2">Urgency *</label>
              <div className="flex gap-2">
                {['emergency', 'scheduled'].map(u => (
                  <label key={u} className={`flex-1 flex items-center gap-2.5 rounded-xl border-2 p-3 cursor-pointer transition-all ${
                    form.urgency_level === u
                      ? u === 'emergency'
                        ? 'border-sv-red bg-sv-red/8 dark:bg-sv-red/10'
                        : 'border-sv-green bg-sv-green/8 dark:bg-sv-green/10'
                      : 'border-gray-200 dark:border-sv-border hover:border-gray-300 dark:hover:border-sv-border-l'
                  }`}>
                    <input type="radio" name="urgency" value={u} checked={form.urgency_level === u}
                      onChange={set_('urgency_level')} className="sr-only" />
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      form.urgency_level === u
                        ? u === 'emergency' ? 'border-sv-red' : 'border-sv-green'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {form.urgency_level === u && (
                        <div className={`w-1.5 h-1.5 rounded-full ${u === 'emergency' ? 'bg-sv-red' : 'bg-sv-green'}`} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{u}</p>
                      <p className="text-xs text-gray-400">{u === 'emergency' ? 'Respond within 2hrs' : 'Schedule a visit'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Visit type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-1.5">Visit Type *</label>
              <select value={form.visit_type} onChange={set_('visit_type')}
                className="w-full bg-white dark:bg-sv-bg-input border border-gray-200 dark:border-sv-border rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-sv-green focus:ring-1 focus:ring-sv-green/20">
                <option value="">Select visit type…</option>
                {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Animal type + count */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-1.5">Bird Type</label>
                <select value={form.animal_type} onChange={set_('animal_type')}
                  className="w-full bg-white dark:bg-sv-bg-input border border-gray-200 dark:border-sv-border rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-sv-green">
                  <option value="">Select…</option>
                  {ANIMAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-1.5">Count</label>
                <input type="number" value={form.animal_count} onChange={set_('animal_count')} placeholder="500"
                  className="w-full bg-white dark:bg-sv-bg-input border border-gray-200 dark:border-sv-border rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-sv-green" />
              </div>
            </div>

            {/* Symptoms — pre-filled from tracker */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-1.5">
                Context for Vet
                {(symptoms?.length > 0 || callNotes) && <span className="ml-2 text-sv-green normal-case font-normal">(pre-filled from call)</span>}
              </label>
              <textarea value={form.symptoms_description} onChange={set_('symptoms_description')}
                rows={5} placeholder="Symptoms, agent notes, and context for the vet…"
                className="w-full bg-white dark:bg-sv-bg-input border border-gray-200 dark:border-sv-border rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-sv-green resize-none" />
            </div>

            {/* Available vets */}
            {availableVets.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-2">
                  Assign Vet / Paravet <span className="text-gray-400 normal-case font-normal ml-1">(optional)</span>
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {availableVets.map(vet => (
                    <label key={vet.id} className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all ${
                      selectedVetId === vet.id
                        ? 'border-sv-green bg-sv-green/8 dark:bg-sv-green/10'
                        : 'border-gray-200 dark:border-sv-border hover:border-sv-green/40'
                    }`}>
                      <input type="radio" name="vet" value={vet.id}
                        checked={selectedVetId === vet.id}
                        onChange={() => setSelectedVetId(selectedVetId === vet.id ? '' : vet.id)}
                        className="sr-only" />
                      <div className="w-2 h-2 rounded-full bg-sv-green flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{vet.name}</p>
                        <p className="text-xs text-gray-400">{[vet.sub_county, vet.district].filter(Boolean).join(', ')} · <span className="capitalize">{vet.role}</span></p>
                      </div>
                      <div className="flex items-center gap-0.5 text-xs text-sv-amber flex-shrink-0">
                        <Star size={11} fill="currentColor" />
                        {vet.rating?.toFixed(1)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Date + time (scheduled) */}
            {!isEmergency && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-1.5">Preferred Date</label>
                  <input type="date" value={form.requested_date} onChange={set_('requested_date')}
                    className="w-full bg-white dark:bg-sv-bg-input border border-gray-200 dark:border-sv-border rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-sv-green" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-1.5">Time Window</label>
                  <select value={form.requested_time_window} onChange={set_('requested_time_window')}
                    className="w-full bg-white dark:bg-sv-bg-input border border-gray-200 dark:border-sv-border rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-sv-green">
                    <option value="morning">Morning (8am–12pm)</option>
                    <option value="afternoon">Afternoon (12pm–5pm)</option>
                    <option value="anytime">Any time</option>
                  </select>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-sv-text-muted uppercase tracking-wide mb-1.5">Farm Location</label>
              <input value={form.location_address} onChange={set_('location_address')}
                placeholder="Village, Sub-county, District"
                className="w-full bg-white dark:bg-sv-bg-input border border-gray-200 dark:border-sv-border rounded-lg px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-sv-green" />
            </div>

            {error && (
              <p className="text-sv-red text-sm bg-sv-red/8 dark:bg-sv-red/10 border border-sv-red/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeDispatchModal}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-sv-border text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium">
                Cancel
              </button>
              <button type="submit" disabled={status === 'loading'}
                className={`flex-1 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                  isEmergency ? 'bg-sv-red hover:bg-sv-red-d' : 'bg-sv-green hover:bg-sv-green-d'
                }`}>
                {status === 'loading'
                  ? <><Loader2 size={15} className="animate-spin" /> Dispatching…</>
                  : isEmergency ? '🚨 Confirm Emergency Dispatch' : '✓ Confirm Dispatch'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
