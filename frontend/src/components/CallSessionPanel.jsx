import { useEffect, useRef, useState } from 'react';
import { api, API_ORIGIN } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CallSessionPanel({ ticketId }) {
  const [recordings, setRecordings] = useState([]);
  const [callState, setCallState] = useState('idle'); // idle | recording | saving
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  function load() {
    api.getRecordings(ticketId).then(setRecordings);
  }

  useEffect(() => {
    load();
    return () => clearInterval(timerRef.current);
  }, [ticketId]);

  async function startCall() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        await saveRecording(blob);
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
    setCallState('saving');
    mediaRecorderRef.current?.stop();
  }

  async function saveRecording(blob) {
    try {
      const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
      const formData = new FormData();
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      formData.append('audio', blob, `call-${ticketId}-${Date.now()}.${ext}`);
      formData.append('duration_seconds', String(duration));
      formData.append('ticket_id', String(ticketId));
      formData.append('agent_name', user?.name || '');
      await api.uploadRecording(formData);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCallState('idle');
      setSeconds(0);
    }
  }

  const canRecord = user?.role !== 'paravet';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-700">Call Session</h2>
        {canRecord && callState === 'idle' && (
          <button onClick={startCall} className="bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-red-dark">
            ● Start Call
          </button>
        )}
        {callState === 'recording' && (
          <div className="flex items-center gap-3">
            <span className="text-brand-red font-medium animate-pulse">● Recording {formatTime(seconds)}</span>
            <button onClick={endCall} className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium">
              ■ End Call
            </button>
          </div>
        )}
        {callState === 'saving' && <span className="text-sm text-gray-500">Saving recording...</span>}
      </div>
      <p className="text-xs text-gray-400 mb-2">
        Recording starts automatically when you begin the call and is saved as soon as it ends — no manual upload needed.
      </p>
      {error && <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-md p-2 mb-2">{error}</p>}

      {recordings.length > 0 && (
        <div className="space-y-2 mt-2">
          {recordings.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-md p-2">
              <p className="text-xs text-gray-500 mb-1">
                {new Date(r.created_at).toLocaleString()}
                {r.agent_name && ` · Agent: ${r.agent_name}`}
                {r.duration_seconds && ` · ${Math.round(r.duration_seconds)}s`}
              </p>
              <audio src={`${API_ORIGIN}/uploads/recordings/${r.filename}`} controls className="w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
