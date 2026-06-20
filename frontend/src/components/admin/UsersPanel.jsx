import { useState, useEffect } from 'react';
import { X, UserPlus, Shield, User, Pencil, Check, Loader2, Phone, Mail, Lock, Eye, EyeOff, RefreshCw, Copy, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', isAdmin: false };

function validate(form, isEdit) {
  if (!form.name.trim()) return 'Name is required';
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

function StatusDot({ status }) {
  const cls =
    status === 'online'   ? 'bg-green-400' :
    status === 'on_call'  ? 'bg-red-400 animate-pulse' :
    status === 'on_break' ? 'bg-amber-400' : 'bg-gray-600';
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
}

function AgentRow({ agent, onEdit }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-sv-border hover:bg-sv-bg-input/40 transition-colors group">
      <StatusDot status={agent.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{agent.name}</p>
          {agent.is_admin && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border border-sv-green/60 text-sv-green bg-sv-green/10">
              <Shield size={8} /> Admin
            </span>
          )}
        </div>
        <p className="text-xs text-sv-text-muted truncate">{agent.email}</p>
        {agent.phone && <p className="text-xs text-sv-text-muted/60 truncate">{agent.phone}</p>}
      </div>
      <span className={`text-xs capitalize px-2 py-0.5 rounded-full border ${
        agent.status === 'online'   ? 'text-green-400 border-green-800 bg-green-950/40' :
        agent.status === 'on_call'  ? 'text-red-400 border-red-800 bg-red-950/40' :
        agent.status === 'on_break' ? 'text-amber-400 border-amber-800 bg-amber-950/40' :
                                      'text-gray-500 border-gray-700 bg-gray-900/40'
      }`}>{agent.status?.replace('_', ' ') || 'offline'}</span>
      <button onClick={() => onEdit(agent)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-gray-500 hover:text-sv-teal transition-all">
        <Pencil size={12} />
      </button>
    </div>
  );
}

function UserForm({ initial, onSave, onCancel, saving, error }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    email: initial.email || '',
    phone: initial.phone || '',
    password: '',
    isAdmin: initial.is_admin || false,
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
    <form onSubmit={submit} className="px-4 py-4 border-b border-sv-border bg-sv-bg-input/20 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-sv-teal mb-2">
        {isEdit ? 'Edit User' : 'Add New User'}
      </p>

      {displayErr && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">{displayErr}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-sv-text-muted uppercase tracking-wider mb-1">Full Name *</label>
          <div className="relative">
            <User size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-7 pr-3 py-2 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green"
              placeholder="Agent name" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-sv-text-muted uppercase tracking-wider mb-1">Phone</label>
          <div className="relative">
            <Phone size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-7 pr-3 py-2 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green"
              placeholder="+256…" />
          </div>
        </div>
      </div>

      {!isEdit && (
        <>
          <div>
            <label className="block text-[10px] font-semibold text-sv-text-muted uppercase tracking-wider mb-1">Email *</label>
            <div className="relative">
              <Mail size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-7 pr-3 py-2 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green"
                placeholder="agent@smartvet.africa" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-sv-text-muted uppercase tracking-wider mb-1">Password *</label>
            <div className="relative">
              <Lock size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full bg-sv-bg-input border border-sv-border rounded-lg pl-7 pr-8 py-2 text-xs text-white placeholder-sv-text-muted focus:outline-none focus:border-sv-green"
                placeholder="Min 8 chars, 1 digit, 1 letter" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          </div>
        </>
      )}

      <label className="flex items-center gap-2.5 cursor-pointer select-none group">
        <div onClick={() => set('isAdmin', !form.isAdmin)}
          className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${form.isAdmin ? 'bg-sv-green' : 'bg-gray-700'}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form.isAdmin ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs text-sv-text-muted group-hover:text-white transition-colors">
          Grant admin privileges <span className="text-gray-600">(full dispatch access)</span>
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sv-green text-white text-xs font-bold hover:bg-sv-green-d disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {isEdit ? 'Save Changes' : 'Create User'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-sv-border text-gray-400 text-xs hover:text-white transition-colors">
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
    <div className="px-4 py-4 border-b border-sv-border bg-amber-950/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={13} className="text-amber-400" />
          <p className="text-xs font-bold text-amber-300">
            {results.imported} imported from SmartVet — save these passwords now
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={12} /></button>
      </div>
      <p className="text-xs text-amber-400/70">Temporary passwords are shown once. Users must change on first login.</p>
      <div className="space-y-2 max-h-52 overflow-y-auto">
        {results.users.map(u => (
          <div key={u.id} className="flex items-center gap-2 bg-sv-bg-input rounded-lg px-3 py-2 text-xs">
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{u.name}</p>
              <p className="text-sv-text-muted truncate">{u.email}</p>
            </div>
            <code className="text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded font-mono text-[11px] flex-shrink-0">
              {u.temp_password}
            </code>
            <button onClick={() => copy(`${u.email} / ${u.temp_password}`, u.id)}
              className="text-gray-500 hover:text-white flex-shrink-0">
              {copied === u.id ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
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
          name: form.name,
          phone_number: form.phone || null,
          is_admin: form.isAdmin,
        });
        setAgents(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
        setFormAgent(null);
        flash('User updated');
      } else {
        const { data } = await api.post('/auth/agents', {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          isAdmin: form.isAdmin,
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

  const online  = agents.filter(a => a.status === 'online' || a.status === 'on_call').length;
  const admins  = agents.filter(a => a.is_admin).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-sv-bg-card border-l border-sv-border flex flex-col h-full shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sv-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">Team Users</h2>
            <p className="text-xs text-sv-text-muted mt-0.5">
              {agents.length} users · {online} online · {admins} admin{admins !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!showAddForm && !formAgent && (
              <>
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sv-teal/10 border border-sv-teal/40 text-sv-teal text-xs font-bold hover:bg-sv-teal/20 disabled:opacity-50 transition-colors">
                  <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Importing…' : 'Import SmartVet'}
                </button>
                <button onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sv-green/10 border border-sv-green/40 text-sv-green text-xs font-bold hover:bg-sv-green/20 transition-colors">
                  <UserPlus size={11} /> Add User
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-2 bg-sv-green/10 border-b border-sv-green/30 text-sv-green text-xs font-medium">
            <Check size={11} /> {successMsg}
          </div>
        )}

        {importResults && (
          <ImportResults results={importResults} onClose={() => setImportResults(null)} />
        )}

        {/* Add form */}
        {showAddForm && (
          <UserForm
            initial={null}
            onSave={handleSave}
            onCancel={() => { setShowAddForm(false); setSaveError(''); }}
            saving={saving}
            error={saveError}
          />
        )}

        {/* Edit form */}
        {formAgent && (
          <UserForm
            initial={formAgent}
            onSave={handleSave}
            onCancel={() => { setFormAgent(null); setSaveError(''); }}
            saving={saving}
            error={saveError}
          />
        )}

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center pt-16 text-gray-600 text-sm gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-gray-600 text-xs gap-2">
              <User size={28} className="text-gray-700" />
              <p>No users yet</p>
              <button onClick={() => setShowAddForm(true)} className="text-sv-teal hover:underline">Add the first user</button>
            </div>
          ) : (
            <>
              {agents.filter(a => a.is_admin).length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-sv-green/70 flex items-center gap-1.5">
                    <Shield size={9} /> Admins
                  </p>
                  {agents.filter(a => a.is_admin).map(a => (
                    <AgentRow key={a.id} agent={a} onEdit={ag => { setFormAgent(ag); setShowAddForm(false); setSaveError(''); }} />
                  ))}
                </div>
              )}
              {agents.filter(a => !a.is_admin).length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                    <User size={9} /> Agents
                  </p>
                  {agents.filter(a => !a.is_admin).map(a => (
                    <AgentRow key={a.id} agent={a} onEdit={ag => { setFormAgent(ag); setShowAddForm(false); setSaveError(''); }} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-sv-border text-xs text-sv-text-muted/50 flex-shrink-0">
          New users can log in immediately with their email + password.
          Email verification is handled via OTP on first login if enabled.
        </div>
      </div>
    </div>
  );
}
