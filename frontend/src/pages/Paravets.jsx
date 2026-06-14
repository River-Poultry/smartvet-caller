import { useEffect, useState } from 'react';
import { api } from '../api/client';

const emptyForm = { name: '', phone: '', specialization: '', location: '' };

const statusStyles = {
  available: 'bg-green-100 text-green-800',
  on_call: 'bg-blue-100 text-blue-800',
  off_duty: 'bg-gray-100 text-gray-700',
};

export default function Paravets() {
  const [paravets, setParavets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function load() {
    api.getParavets().then(setParavets);
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.createParavet(form);
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function handleStatusChange(id, status) {
    await api.updateParavet(id, { status });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Paravets</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800"
        >
          {showForm ? 'Cancel' : 'Add Paravet'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Specialization" value={form.specialization} onChange={(v) => setForm({ ...form, specialization: v })} />
          <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <div className="col-span-2">
            <button className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800">Save</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {paravets.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-800">{p.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[p.status] || 'bg-gray-100 text-gray-700'}`}>
                {p.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500">{p.specialization || 'General'}</p>
            <p className="text-sm text-gray-500">{p.location || '—'}</p>
            <p className="text-sm text-gray-500 mb-3">{p.phone || '—'}</p>
            <select
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              value={p.status}
              onChange={(e) => handleStatusChange(p.id, e.target.value)}
            >
              <option value="available">Available</option>
              <option value="on_call">On Call</option>
              <option value="off_duty">Off Duty</option>
            </select>
          </div>
        ))}
        {paravets.length === 0 && <p className="text-gray-400 col-span-3 text-center py-10">No paravets registered yet</p>}
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
