import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ROLES = ['admin', 'supervisor', 'agent', 'paravet'];

const ROLE_LABELS = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  agent: 'Agent / Dispatcher',
  paravet: 'Paravet (read-only)',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { user: currentUser } = useAuth();

  function load() {
    api.getUsers().then(setUsers);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createUser(form);
      setForm({ name: '', email: '', password: '', role: 'agent' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(id, role) {
    await api.updateUser(id, { role });
    load();
  }

  async function handleStatusToggle(u) {
    await api.updateUser(u.id, { status: u.status === 'active' ? 'disabled' : 'active' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await api.deleteUser(id);
    load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-brand-navy mb-1">User Accounts</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage call center access levels — administrators, supervisors, agents and field paravets.
      </p>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-brand-navy">Add User</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-md p-2">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create User'}
        </button>
      </form>

      <h2 className="font-semibold text-brand-navy mb-2">All Users</h2>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-brand-navy">
                {u.name} {u.id === currentUser.id && <span className="text-xs text-gray-400">(you)</span>}
              </p>
              <p className="text-sm text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                disabled={u.id === currentUser.id}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleStatusToggle(u)}
                disabled={u.id === currentUser.id}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border disabled:opacity-50 ${
                  u.status === 'active'
                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }`}
              >
                {u.status === 'active' ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleDelete(u.id)}
                disabled={u.id === currentUser.id}
                className="text-red-600 text-sm hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
