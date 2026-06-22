import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, Star, AlertTriangle } from 'lucide-react';
import { useCallStore } from '../../../store/callStore.js';
import api from '../../../services/api.js';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b rounded-t-2xl ${
          isEmergency ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-2.5">
            {isEmergency && <AlertTriangle size={18} className="text-red-500" />}
            <h2 className="text-base font-bold text-gray-900">
              {isEmergency ? '🚨 Emergency Dispatch' : '🚑 Vet Dispatch Request'}
            </h2>
          </div>
          <button onClick={closeDispatchModal} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center">
            <CheckCircle size={48} className="text-green-600 mx-auto mb-3" />
            <p className="text-lg font-bold text-gray-900 mb-1">Dispatch Created!</p>
            {result?.paravet_assigned ? (
              <p className="text-gray-500 text-sm">
                <strong>{result.paravet_assigned.name}</strong> assigned.
                {result.paravet_assigned.eta_minutes && ` ETA: ${result.paravet_assigned.eta_minutes} min`}
              </p>
            ) : (
              <p className="text-gray-400 text-sm mt-1">Pending vet assignment — admin will be notified.</p>
            )}
            <button onClick={closeDispatchModal}
              className="mt-5 px-6 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg font-medium transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[72vh] overflow-y-auto bg-gray-50 rounded-b-2xl">

            {/* Farmer info */}
            {activeCall?.farmer?.name && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm">
                <p className="text-xs text-green-700 font-medium mb-0.5">Caller</p>
                <p className="font-semibold text-gray-900">{activeCall.farmer.name}</p>
                <p className="text-gray-500 text-xs">{activeCall.farmer.phone}</p>
              </div>
            )}

            {/* Urgency */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Urgency *</label>
              <div className="flex gap-2">
                {['emergency', 'scheduled'].map(u => (
                  <label key={u} className={`flex-1 flex items-center gap-2.5 rounded-xl border-2 p-3 cursor-pointer transition-all bg-white ${
                    form.urgency_level === u
                      ? u === 'emergency'
                        ? 'border-red-400 bg-red-50'
                        : 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="urgency" value={u} checked={form.urgency_level === u}
                      onChange={set_('urgency_level')} className="sr-only" />
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      form.urgency_level === u
                        ? u === 'emergency' ? 'border-red-400' : 'border-green-600'
                        : 'border-gray-300'
                    }`}>
                      {form.urgency_level === u && (
                        <div className={`w-1.5 h-1.5 rounded-full ${u === 'emergency' ? 'bg-red-400' : 'bg-green-600'}`} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 capitalize">{u}</p>
                      <p className="text-xs text-gray-400">{u === 'emergency' ? 'Respond within 2hrs' : 'Schedule a visit'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Visit type */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Visit Type *</label>
              <select value={form.visit_type} onChange={set_('visit_type')}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-green-600">
                <option value="">Select visit type…</option>
                {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Animal type + count */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Bird Type</label>
                <select value={form.animal_type} onChange={set_('animal_type')}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-green-600">
                  <option value="">Select…</option>
                  {ANIMAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Count</label>
                <input type="number" value={form.animal_count} onChange={set_('animal_count')} placeholder="500"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-green-600" />
              </div>
            </div>

            {/* Symptoms — pre-filled from tracker */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Context for Vet
                {(symptoms?.length > 0 || callNotes) && <span className="ml-2 text-green-700 normal-case font-normal">(pre-filled from call)</span>}
              </label>
              <textarea value={form.symptoms_description} onChange={set_('symptoms_description')}
                rows={5} placeholder="Symptoms, agent notes, and context for the vet…"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-600 resize-none" />
            </div>

            {/* Available vets */}
            {availableVets.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Assign Vet / Paravet <span className="text-gray-400 normal-case font-normal ml-1">(optional)</span>
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {availableVets.map(vet => (
                    <label key={vet.id} className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all bg-white ${
                      selectedVetId === vet.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}>
                      <input type="radio" name="vet" value={vet.id}
                        checked={selectedVetId === vet.id}
                        onChange={() => setSelectedVetId(selectedVetId === vet.id ? '' : vet.id)}
                        className="sr-only" />
                      <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{vet.name}</p>
                        <p className="text-xs text-gray-400">{[vet.sub_county, vet.district].filter(Boolean).join(', ')} · <span className="capitalize">{vet.role}</span></p>
                      </div>
                      <div className="flex items-center gap-0.5 text-xs text-amber-500 flex-shrink-0">
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
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Preferred Date</label>
                  <input type="date" value={form.requested_date} onChange={set_('requested_date')}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-green-600" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Time Window</label>
                  <select value={form.requested_time_window} onChange={set_('requested_time_window')}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-green-600">
                    <option value="morning">Morning (8am–12pm)</option>
                    <option value="afternoon">Afternoon (12pm–5pm)</option>
                    <option value="anytime">Any time</option>
                  </select>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Farm Location</label>
              <input value={form.location_address} onChange={set_('location_address')}
                placeholder="Village, Sub-county, District"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-green-600" />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeDispatchModal}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors text-sm font-medium bg-white">
                Cancel
              </button>
              <button type="submit" disabled={status === 'loading'}
                className={`flex-1 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                  isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-green-700 hover:bg-green-800'
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
