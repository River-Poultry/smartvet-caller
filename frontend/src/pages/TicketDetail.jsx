import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from './Dashboard';
import CallSessionPanel from '../components/CallSessionPanel';
import { useAuth } from '../context/AuthContext';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = !['paravet', 'vetboard'].includes(user?.role);
  const [ticket, setTicket] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [vsbReview, setVsbReview] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.getTicket(id).then((t) => {
      setTicket(t);
      setTranscript(t.transcript || '');
    });
    api.getVetboardReviews().then((reviews) => {
      const active = reviews.find((r) => r.ticket_id === Number(id) && r.status !== 'completed');
      const completed = reviews.filter((r) => r.ticket_id === Number(id) && r.status === 'completed');
      setVsbReview(active || completed[0] || null);
    }).catch(() => {});
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

      {canEdit && (
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
      )}

      {/* VSB Review status (auto-created on resolution) */}
      {vsbReview && (
        <div className={`rounded-lg p-3 mb-4 text-sm border ${vsbReview.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="font-medium text-gray-700 mb-0.5">
            ⚖ Vet Science Board Review — <span className="capitalize">{vsbReview.status.replace('_', ' ')}</span>
          </p>
          {vsbReview.findings && <p className="text-gray-600 mt-1"><span className="font-medium">Findings:</span> {vsbReview.findings}</p>}
          {vsbReview.recommendation && <p className="text-gray-600"><span className="font-medium">Recommendation:</span> {vsbReview.recommendation}</p>}
          {!vsbReview.findings && <p className="text-gray-500 text-xs mt-0.5">Queued for VSB review — resolve the case to trigger review.</p>}
        </div>
      )}

      <CallSessionPanel ticketId={id} />

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-700 mb-2">Call Transcript &amp; AI Summary</h2>
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-2"
          rows={5}
          placeholder="Paste or type the call transcript / notes here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={!canEdit}
        />
        {canEdit && (
        <button
          onClick={handleSummarize}
          disabled={summarizing || !transcript.trim()}
          className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50"
        >
          {summarizing ? 'Summarizing...' : 'Summarize with AI'}
        </button>
        )}
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
