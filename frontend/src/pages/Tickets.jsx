import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from './Dashboard';

const emptyForm = { farmer_name: '', phone: '', location: '', animal_type: '', issue_description: '', priority: 'normal' };

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.getTickets(statusFilter || undefined).then(setTickets).finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.createTicket(form);
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Cases</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800"
        >
          {showForm ? 'Cancel' : 'New Case'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
          <Input label="Farmer Name" value={form.farmer_name} onChange={(v) => setForm({ ...form, farmer_name: v })} required />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <Input label="Animal Type" value={form.animal_type} onChange={(v) => setForm({ ...form, animal_type: v })} />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
              value={form.issue_description}
              onChange={(e) => setForm({ ...form, issue_description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800">
              Create Case
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex gap-2">
        {['', 'open', 'assigned', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              statusFilter === s ? 'bg-emerald-700 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-gray-500 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Farmer</th>
                <th className="px-4 py-2 font-medium">Animal</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/tickets/${t.id}`} className="font-medium text-gray-800 hover:text-emerald-700">
                      {t.farmer_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{t.animal_type || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{t.location || '—'}</td>
                  <td className="px-4 py-2.5 capitalize text-gray-600">{t.priority}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No cases found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
