import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'callback_needed', label: 'Callback Needed' },
];

const STATUS_STYLES = {
  completed: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-green-100 text-green-800',
  no_answer: 'bg-amber-100 text-amber-800',
  voicemail: 'bg-blue-100 text-blue-800',
  callback_needed: 'bg-red-100 text-red-800',
};

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Calls() {
  const { user } = useAuth();
  const canCall = user?.role !== 'paravet';
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState({ farmers: [], paravets: [] });
  const [tab, setTab] = useState('farmers');
  const [activeContact, setActiveContact] = useState(null);

  function load() {
    api.getCallContacts(query).then(setContacts);
  }

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [query]);

  const list = tab === 'farmers' ? contacts.farmers : contacts.paravets;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">Calls</h1>
      <p className="text-sm text-gray-500 mb-4">Pick a farmer or paravet from the directory to start and log a call.</p>

      <input
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
        placeholder="Search by name or phone number..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('farmers')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
            tab === 'farmers' ? 'bg-brand-red text-white border-brand-red' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          Farmers ({contacts.farmers.length})
        </button>
        <button
          onClick={() => setTab('paravets')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
            tab === 'paravets' ? 'bg-brand-red text-white border-brand-red' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          Paravets ({contacts.paravets.length})
        </button>
      </div>

      <div className="space-y-3">
        {list.map((contact) => (
          <div key={`${contact.contact_type}-${contact.contact_id}`} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{contact.name}</p>
                <p className="text-sm text-gray-500">
                  {contact.phone || 'No phone on file'}
                  {contact.location && ` · ${contact.location}`}
                  {contact.contact_type === 'farmer' && contact.animal_type && ` · ${contact.animal_type}`}
                  {contact.contact_type === 'paravet' && contact.specialization && ` · ${contact.specialization}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {contact.contact_type === 'farmer' && (
                  <Link to={`/tickets/${contact.contact_id}`} className="text-sm text-brand-navy hover:underline">
                    View Case
                  </Link>
                )}
                {canCall && (
                  <button
                    onClick={() => setActiveContact(activeContact?.contact_id === contact.contact_id && activeContact?.contact_type === contact.contact_type ? null : contact)}
                    className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark"
                  >
                    {activeContact?.contact_id === contact.contact_id && activeContact?.contact_type === contact.contact_type ? 'Close' : '📞 Call'}
                  </button>
                )}
              </div>
            </div>

            {activeContact?.contact_id === contact.contact_id && activeContact?.contact_type === contact.contact_type && (
              <CallPanel contact={contact} onDone={() => setActiveContact(null)} />
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-gray-400 text-center py-10">No contacts found</p>}
      </div>
    </div>
  );
}

function CallPanel({ contact, onDone }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState('idle'); // idle | recording | review
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const blobRef = useRef(null);

  useEffect(() => {
    api.getCalls(`contact_type=${contact.contact_type}&contact_id=${contact.contact_id}`).then(setHistory);
    return () => clearInterval(timerRef.current);
  }, [contact]);

  async function startCall() {
    setError('');
    blobRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        blobRef.current = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setCallState('review');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      startedAtRef.current = Date.now();
      setCallState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError('Microphone access is required to record this call: ' + err.message);
    }
  }

  function endCall() {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }

  async function saveLog() {
    setError('');
    try {
      const duration = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
      const formData = new FormData();
      if (blobRef.current) {
        const ext = blobRef.current.type.includes('mp4') ? 'm4a' : 'webm';
        formData.append('audio', blobRef.current, `call-${contact.contact_type}-${contact.contact_id}-${Date.now()}.${ext}`);
        formData.append('duration_seconds', String(duration));
      }
      formData.append('contact_type', contact.contact_type);
      formData.append('contact_id', String(contact.contact_id));
      formData.append('contact_name', contact.name);
      if (contact.phone) formData.append('phone', contact.phone);
      if (contact.contact_type === 'farmer') formData.append('ticket_id', String(contact.contact_id));
      formData.append('status', status);
      formData.append('notes', notes);

      await api.logCall(formData);
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700 text-sm">Call {contact.name}</h3>
        {callState === 'idle' && (
          <button onClick={startCall} className="bg-brand-navy text-white px-3 py-1.5 rounded-md text-sm font-medium">
            ● Start Recording
          </button>
        )}
        {callState === 'recording' && (
          <div className="flex items-center gap-3">
            <span className="text-brand-red font-medium animate-pulse">● Recording {formatTime(seconds)}</span>
            <button onClick={endCall} className="bg-brand-navy text-white px-3 py-1.5 rounded-md text-sm font-medium">
              ■ End Call
            </button>
          </div>
        )}
        {callState === 'review' && <span className="text-sm text-gray-500">Recorded {formatTime(seconds)} — ready to save</span>}
      </div>

      {error && <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-md p-2 mb-2">{error}</p>}

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Call Outcome</label>
          <select className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-2"
        rows={2}
        placeholder="Notes about this call..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={saveLog} disabled={callState === 'recording'} className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50">
          Save Call Log
        </button>
        <button onClick={onDone} className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-200">
          Cancel
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">Previous calls</p>
          {history.map((c) => (
            <div key={c.id} className="border border-gray-100 rounded-md p-2 text-xs text-gray-500 flex items-center justify-between">
              <span>
                {new Date(c.created_at).toLocaleString()} · {c.agent_name}
                {c.notes && ` — ${c.notes}`}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-700'}`}>
                {(STATUS_OPTIONS.find((o) => o.value === c.status)?.label) || c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
