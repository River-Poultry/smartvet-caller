import { useEffect, useRef, useState } from 'react';
import { api, API_ORIGIN } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Recordings() {
  const { user } = useAuth();
  const canRecord = user?.role !== 'paravet';
  const [recordings, setRecordings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | stopped
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [ticketId, setTicketId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  function load() {
    api.getRecordings().then(setRecordings);
  }

  useEffect(() => {
    load();
    api.getTickets().then(setTickets);
    return () => clearInterval(timerRef.current);
  }, []);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecordingState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError('Microphone access is required to record calls: ' + err.message);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecordingState('stopped');
  }

  function discardRecording() {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setTicketId('');
    setAgentName('');
    setSeconds(0);
    setRecordingState('idle');
  }

  async function handleSave() {
    if (!audioBlob) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      formData.append('audio', audioBlob, `recording.${ext}`);
      formData.append('duration_seconds', String(seconds));
      if (ticketId) formData.append('ticket_id', ticketId);
      if (agentName) formData.append('agent_name', agentName);
      if (transcript) formData.append('transcript', transcript);

      await api.uploadRecording(formData);
      discardRecording();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this recording? This cannot be undone.')) return;
    await api.deleteRecording(id);
    load();
  }

  function formatTime(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-brand-navy mb-1">Call Recordings &amp; Transcripts</h1>
      <p className="text-sm text-gray-500 mb-6">
        Record calls and add transcripts to build a training dataset for the AI assistant.
      </p>

      {canRecord && (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {recordingState === 'idle' && (
            <button onClick={startRecording} className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark">
              ● Start Recording
            </button>
          )}
          {recordingState === 'recording' && (
            <>
              <button onClick={stopRecording} className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium">
                ■ Stop Recording
              </button>
              <span className="text-brand-red font-medium animate-pulse">● Recording {formatTime(seconds)}</span>
            </>
          )}
          {recordingState === 'stopped' && (
            <span className="text-sm text-gray-600">Recorded {formatTime(seconds)} — review and save below</span>
          )}
        </div>

        {error && <p className="text-amber-700 text-sm mb-3 bg-amber-50 border border-amber-200 rounded-md p-2">{error}</p>}

        {audioUrl && (
          <div className="space-y-3">
            <audio src={audioUrl} controls className="w-full" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Case (optional)</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                >
                  <option value="">No case</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} {t.farmer_name} — {t.animal_type || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name (optional)</label>
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transcript (optional)</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={4}
                placeholder="Type or paste the call transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={uploading}
                className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50"
              >
                {uploading ? 'Saving...' : 'Save Recording'}
              </button>
              <button onClick={discardRecording} className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      <h2 className="font-semibold text-brand-navy mb-2">Saved Recordings</h2>
      <div className="space-y-3">
        {recordings.map((r) => (
          <RecordingCard key={r.id} recording={r} onChange={load} onDelete={() => handleDelete(r.id)} canEdit={canRecord} />
        ))}
        {recordings.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            No recordings yet
          </div>
        )}
      </div>
    </div>
  );
}

function RecordingCard({ recording, onChange, onDelete, canEdit }) {
  const [transcript, setTranscript] = useState(recording.transcript || '');
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState('');

  async function handleSaveTranscript() {
    setSaving(true);
    try {
      await api.updateRecording(recording.id, { transcript });
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function handleSummarize() {
    setError('');
    setSummarizing(true);
    try {
      await api.summarizeTranscript(transcript, recording.ticket_id, recording.id);
      onChange();
    } catch (err) {
      setError(err.code === 'AI_NOT_CONFIGURED' ? 'AI assistant is not configured yet.' : err.message);
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-500">
          {new Date(recording.created_at).toLocaleString()}
          {recording.agent_name && ` · Agent: ${recording.agent_name}`}
          {recording.ticket_id && ` · Case #${recording.ticket_id}`}
          {recording.duration_seconds && ` · ${Math.round(recording.duration_seconds)}s`}
        </div>
        {canEdit && (
          <button onClick={onDelete} className="text-red-600 text-sm hover:underline">
            Delete
          </button>
        )}
      </div>
      <audio src={`${API_ORIGIN}/uploads/recordings/${recording.filename}`} controls className="w-full mb-2" />
      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-2"
        rows={3}
        placeholder="Transcript..."
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        disabled={!canEdit}
      />
      {canEdit && (
      <div className="flex gap-2">
        <button
          onClick={handleSaveTranscript}
          disabled={saving}
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Transcript'}
        </button>
        <button
          onClick={handleSummarize}
          disabled={summarizing || !transcript.trim()}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-brand-red text-white hover:bg-brand-red-dark disabled:opacity-50"
        >
          {summarizing ? 'Summarizing...' : 'Summarize with AI'}
        </button>
      </div>
      )}
      {error && <p className="text-amber-700 text-sm mt-2 bg-amber-50 border border-amber-200 rounded-md p-2">{error}</p>}
      {recording.ai_summary && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm whitespace-pre-wrap">
          <p className="font-medium text-brand-red-dark mb-1">AI Summary</p>
          {recording.ai_summary}
        </div>
      )}
    </div>
  );
}
