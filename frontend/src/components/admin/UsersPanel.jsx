import { useState, useEffect } from 'react';
import {
  X, UserPlus, Shield, User, Pencil, Check, Loader2,
  Phone, Mail, Lock, Eye, EyeOff, RefreshCw, Copy, AlertCircle,
  Users, GraduationCap, ClipboardList,
} from 'lucide-react';
import api from '../../services/api.js';
import { ROLES, ROLE_ORDER } from '../../constants/roles.js';

const ROLE_ICONS = {
  admin:      Shield,
  supervisor: ClipboardList,
  agent:      Users,
  trainee:    GraduationCap,
};

const ROLE_BADGE_CLASS = {
  admin:      'text-green-600 border-green-300 bg-green-50',
  supervisor: 'text-blue-600 border-blue-300 bg-blue-50',
  agent:      'text-gray-600 border-gray-300 bg-gray-100',
  trainee:    'text-amber-600 border-amber-300 bg-amber-50',
};

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', role: 'agent' };

function validate(form, isEdit) {
  if (!form.name.trim()) return 'Name is required';
  if (!ROLE_ORDER.includes(form.role)) return 'Please select a valid role';
  if (!isEdit) {
    if (!form.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Invalid email';
    if (!form.password) return 'Password is required';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (!/[0-9]/.test(form.password)) return 'Password must contain a digit';
    if (!/[a-zA-Z]/.test(form.password)) return 'Password must contain a letter';
  }
  return null;
}

function RoleBadge({ role }) {
  const Icon = ROLE_ICONS[role] || User;
  const meta = ROLES[role] || { label: role };
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${ROLE_BADGE_CLASS[role] || 'text-gray-600 border-gray-300 bg-gray-100'}`}>
      <Icon size={8} /> {meta.label}
    </span>
  );
}

function StatusDot({ status }) {
  const cls =
    status === 'online'   ? 'bg-green-400' :
    status === 'on_call'  ? 'bg-red-400 animate-pulse' :
    status === 'on_break' ? 'bg-amber-400' : 'bg-gray-400';
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
}

function AgentRow({ agent, onEdit }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
      <StatusDot status={agent.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
          <RoleBadge role={agent.role || (agent.is_admin ? 'admin' : 'agent')} />
        </div>
        <p className="text-xs text-gray-500 truncate">{agent.email}</p>
        {agent.phone_number && <p className="text-xs text-gray-400 truncate">{agent.phone_number}</p>}
      </div>
      <span className={`text-xs capitalize px-2 py-0.5 rounded-full border ${
        agent.status === 'online'   ? 'text-green-700 border-green-200 bg-green-50' :
        agent.status === 'on_call'  ? 'text-red-700 border-red-200 bg-red-50' :
        agent.status === 'on_break' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                                      'text-gray-500 border-gray-200 bg-gray-50'
      }`}>{agent.status?.replace('_', ' ') || 'offline'}</span>
      <button onClick={() => onEdit(agent)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-gray-400 hover:text-green-700 transition-all">
        <Pencil size={12} />
      </button>
    </div>
  );
}

function UserForm({ initial, onSave, onCancel, saving, error }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial ? {
    name:     initial.name || '',
    email:    initial.email || '',
    phone:    initial.phone_number || '',
    password: '',
    role:     initial.role || (initial.is_admin ? 'admin' : 'agent'),
  } : EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [localErr, setLocalErr] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setLocalErr(''); }

  function submit(e) {
    e.preventDefault();
    const err = validate(form, isEdit);
    if (err) { setLocalErr(err); return; }
    onSave(form, isEdit);
  }

  const displayErr = localErr || error;

  return (
    <form onSubmit={submit} className="px-4 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-2">
        {isEdit ? 'Edit User' : 'Add New User'}
      </p>

      {displayErr && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{displayErr}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
          <div className="relative">
            <User size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600"
              placeholder="Full name" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
          <div className="relative">
            <Phone size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600"
              placeholder="+256…" />
          </div>
        </div>
      </div>

      {/* Role selector */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Role *</label>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_ORDER.map(r => {
            const Icon = ROLE_ICONS[r];
            const meta = ROLES[r];
            return (
              <button
                key={r}
                type="button"
                onClick={() => set('role', r)}
                className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                  form.role === r
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}>
                <Icon size={13} className={form.role === r ? 'text-green-700 mt-0.5' : 'text-gray-400 mt-0.5'} />
                <div>
                  <p className={`text-xs font-semibold ${form.role === r ? 'text-green-800' : 'text-gray-700'}`}>
                    {meta.label}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{meta.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {!isEdit && (
        <>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Email *</label>
            <div className="relative">
              <Mail size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600"
                placeholder="agent@smartvet.africa" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Password *</label>
            <div className="relative">
              <Lock size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-8 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600"
                placeholder="Min 8 chars, 1 digit, 1 letter" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-700 text-white text-xs font-bold hover:bg-green-800 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {isEdit ? 'Save Changes' : 'Create User'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 text-xs hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ImportResults({ results, onClose }) {
  const [copied, setCopied] = useState(null);

  function copy(text, id) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="px-4 py-4 border-b border-amber-200 bg-amber-50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={13} className="text-amber-600" />
          <p className="text-xs font-bold text-amber-800">
            {results.imported} imported from SmartVet — save these passwords now
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
      </div>
      <p className="text-xs text-amber-700">Temporary passwords are shown once. Users must change on first login.</p>
      <div className="space-y-2 max-h-52 overflow-y-auto">
        {results.users.map(u => (
          <div key={u.id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs">
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-medium truncate">{u.name}</p>
              <p className="text-gray-500 truncate">{u.email}</p>
            </div>
            <code className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-mono text-[11px] flex-shrink-0">
              {u.temp_password}
            </code>
            <button onClick={() => copy(`${u.email} / ${u.temp_password}`, u.id)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              {copied === u.id ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UsersPanel({ onClose }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formAgent, setFormAgent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [importResults, setImportResults] = useState(null);

  useEffect(() => {
    api.get('/agents').then(r => setAgents(r.data || [])).finally(() => setLoading(false));
  }, []);

  function flash(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  async function handleSync() {
    setSyncing(true);
    setImportResults(null);
    try {
      const { data } = await api.post('/agents/sync-django');
      setImportResults(data);
      if (data.imported > 0) {
        const { data: fresh } = await api.get('/agents');
        setAgents(fresh || []);
        flash(`${data.imported} user${data.imported !== 1 ? 's' : ''} imported from SmartVet`);
      } else {
        flash('No new users to import');
      }
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave(form, isEdit) {
    setSaving(true);
    setSaveError('');
    try {
      if (isEdit) {
        const { data } = await api.patch(`/agents/${formAgent.id}`, {
          name:         form.name,
          phone_number: form.phone || null,
          role:         form.role,
        });
        setAgents(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
        setFormAgent(null);
        flash('User updated');
      } else {
        const { data } = await api.post('/agents', {
          name:         form.name,
          email:        form.email,
          phone_number: form.phone || undefined,
          password:     form.password,
          role:         form.role,
        });
        setAgents(prev => [...prev, { ...data, status: 'offline' }]);
        setShowAddForm(false);
        flash('User created — they can log in immediately');
      }
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const online = agents.filter(a => a.status === 'online' || a.status === 'on_call').length;

  const grouped = ROLE_ORDER.reduce((acc, role) => {
    const group = agents.filter(a => (a.role || (a.is_admin ? 'admin' : 'agent')) === role);
    if (group.length) acc.push({ role, agents: group });
    return acc;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">Team Users</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {agents.length} users · {online} online
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!showAddForm && !formAgent && (
              <>
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 disabled:opacity-50 transition-colors">
                  <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Importing…' : 'Import SmartVet'}
                </button>
                <button onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors">
                  <UserPlus size={11} /> Add User
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200 text-green-700 text-xs font-medium">
            <Check size={11} /> {successMsg}
          </div>
        )}

        {importResults && (
          <ImportResults results={importResults} onClose={() => setImportResults(null)} />
        )}

        {showAddForm && (
          <UserForm
            initial={null}
            onSave={handleSave}
            onCancel={() => { setShowAddForm(false); setSaveError(''); }}
            saving={saving}
            error={saveError}
          />
        )}

        {formAgent && (
          <UserForm
            initial={formAgent}
            onSave={handleSave}
            onCancel={() => { setFormAgent(null); setSaveError(''); }}
            saving={saving}
            error={saveError}
          />
        )}

        {/* Agent list grouped by role */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center pt-16 text-gray-400 text-sm gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-gray-400 text-xs gap-2">
              <User size={28} className="text-gray-300" />
              <p>No users yet</p>
              <button onClick={() => setShowAddForm(true)} className="text-green-700 hover:underline">Add the first user</button>
            </div>
          ) : (
            grouped.map(({ role, agents: group }) => {
              const Icon = ROLE_ICONS[role] || User;
              const meta = ROLES[role] || { label: role };
              return (
                <div key={role}>
                  <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                    <Icon size={10} className="text-gray-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{meta.label}s</p>
                    <span className="text-[10px] text-gray-300 ml-1">({group.length})</span>
                  </div>
                  {group.map(a => (
                    <AgentRow key={a.id} agent={a} onEdit={ag => { setFormAgent(ag); setShowAddForm(false); setSaveError(''); }} />
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400 flex-shrink-0">
          New users can log in immediately with their email + password.
        </div>
      </div>
    </div>
  );
}
