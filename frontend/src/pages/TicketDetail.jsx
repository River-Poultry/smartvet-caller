import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from './Dashboard';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.getTicket(id).then((t) => {
      setTicket(t);
      setTranscript(t.transcript || '');
    });
  }

  useEffect(load, [id]);

  async function updateStatus(status) {
    await api.updateTicket(id, { status });
    load();
  }

  async function handleSummarize() {
    setError('');
    setSummarizing(true);
    try {
      await api.summarizeTranscript(transcript, id);
      load();
    } catch (err) {
      setError(err.code === 'AI_NOT_CONFIGURED' ? 'AI assistant is not configured yet. Set AI_MODEL_API_URL in backend/.env.' : err.message);
    } finally {
      setSummarizing(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this case?')) return;
    await api.deleteTicket(id);
    navigate('/tickets');
  }

  if (!ticket) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{ticket.farmer_name}</h1>
          <p className="text-sm text-gray-500">Case #{ticket.id} · {new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="Phone" value={ticket.phone} />
        <Field label="Location" value={ticket.location} />
        <Field label="Animal Type" value={ticket.animal_type} />
        <Field label="Priority" value={ticket.priority} className="capitalize" />
        <div className="col-span-2">
          <p className="text-gray-500 mb-1">Issue Description</p>
          <p className="text-gray-800">{ticket.issue_description || '—'}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['open', 'in_progress', 'assigned', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
              ticket.status === s ? 'bg-brand-red text-white border-brand-red' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
        <button onClick={handleDelete} className="ml-auto px-3 py-1.5 rounded-md text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50">
          Delete Case
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-700 mb-2">Call Transcript &amp; AI Summary</h2>
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-2"
          rows={5}
          placeholder="Paste or type the call transcript / notes here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <button
          onClick={handleSummarize}
          disabled={summarizing || !transcript.trim()}
          className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50"
        >
          {summarizing ? 'Summarizing...' : 'Summarize with AI'}
        </button>
        {error && <p className="text-amber-700 text-sm mt-2 bg-amber-50 border border-amber-200 rounded-md p-2">{error}</p>}
        {ticket.ai_summary && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm whitespace-pre-wrap">
            <p className="font-medium text-brand-red-dark mb-1">AI Summary</p>
            {ticket.ai_summary}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, className = '' }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className={`text-gray-800 ${className}`}>{value || '—'}</p>
    </div>
  );
}
