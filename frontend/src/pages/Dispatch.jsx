import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dispatch() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'paravet';
  const [dispatches, setDispatches] = useState([]);
  const [openTickets, setOpenTickets] = useState([]);
  const [availableParavets, setAvailableParavets] = useState([]);
  const [form, setForm] = useState({ ticket_id: '', paravet_id: '', scheduled_time: '', notes: '' });
  const [error, setError] = useState('');

  function load() {
    api.getDispatches().then(setDispatches);
    api.getTickets('open').then(setOpenTickets);
    api.getParavets('available').then(setAvailableParavets);
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.ticket_id || !form.paravet_id) {
      setError('Select a case and a paravet');
      return;
    }
    try {
      await api.createDispatch(form);
      setForm({ ticket_id: '', paravet_id: '', scheduled_time: '', notes: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleComplete(id) {
    await api.updateDispatch(id, { status: 'completed' });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dispatch</h1>

      {canEdit && (
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Case</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={form.ticket_id}
            onChange={(e) => setForm({ ...form, ticket_id: e.target.value })}
          >
            <option value="">Select an open case...</option>
            {openTickets.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} {t.farmer_name} — {t.animal_type || 'N/A'} ({t.location || 'no location'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paravet</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={form.paravet_id}
            onChange={(e) => setForm({ ...form, paravet_id: e.target.value })}
          >
            <option value="">Select an available paravet...</option>
            {availableParavets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.specialization || 'General'} ({p.location || 'no location'})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time</label>
          <input
            type="datetime-local"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={form.scheduled_time}
            onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
        <div className="col-span-2">
          <button className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark">
            Assign Paravet
          </button>
        </div>
      </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Case</th>
              <th className="px-4 py-2 font-medium">Paravet</th>
              <th className="px-4 py-2 font-medium">Scheduled</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dispatches.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-800">{d.farmer_name}</p>
                  <p className="text-gray-500 text-xs">{d.animal_type || '—'} · {d.ticket_location || '—'}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{d.paravet_name}</td>
                <td className="px-4 py-2.5 text-gray-600">{d.scheduled_time ? new Date(d.scheduled_time).toLocaleString() : '—'}</td>
                <td className="px-4 py-2.5 capitalize text-gray-600">{d.status}</td>
                <td className="px-4 py-2.5">
                  {d.status !== 'completed' && canEdit && (
                    <button onClick={() => handleComplete(d.id)} className="text-brand-red text-sm hover:underline">
                      Mark Completed
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {dispatches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No dispatches yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
