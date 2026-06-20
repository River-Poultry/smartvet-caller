import { useEffect } from 'react';
import { connectWS, on } from '../services/websocket.js';
import { useAuthStore } from '../store/authStore.js';
import { useCallStore } from '../store/callStore.js';

function norm(s) {
  return {
    id: s.id || `ws-${Date.now()}-${Math.random()}`,
    category: s.category || 'general_advice',
    suggestion_text: s.suggestion_text || s.text || '',
    confidence_score: s.confidence_score ?? s.confidence ?? 0,
    actions: s.actions || [],
    generated_at: s.generated_at || new Date().toISOString(),
  };
}

export function useWebSocket() {
  const token = useAuthStore((s) => s.token);
  const { setActiveCall, addTranscriptSegment, addSuggestion, setSuggestions, clearCall } = useCallStore();

  useEffect(() => {
    if (!token) return;
    connectWS(token);

    const unsubs = [
      on('INBOUND_CALL', (data) => {
        setActiveCall({
          call_id: data.callId,
          twilio_call_sid: data.callSid,
          farmer: data.farmer,
          call_timer_seconds: 0,
          recording_active: true,
          is_emergency: false,
        });
      }),
      on('CALL_ENDED', () => clearCall()),
      on('TRANSCRIPT_SEGMENT', (seg) => addTranscriptSegment(seg)),
      on('AI_SUGGESTION', (data) => {
        if (data?.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions.map(norm));
        } else if (data) {
          addSuggestion(norm(data));
        }
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [token]);
}
