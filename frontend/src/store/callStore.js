import { create } from 'zustand';
import api from '../services/api.js';

export const useCallStore = create((set, get) => {
if (import.meta.env.DEV) window.__callStore__ = { setState: (s) => set(s) };
return ({
  activeCall: null,
  suggestions: [],
  transcriptSegments: [],
  dispatchModalOpen: false,
  dispatchUrgency: 'scheduled',
  postCallOpen: false,
  loading: false,

  setActiveCall: (call) => set({ activeCall: call }),

  fetchActiveCall: async () => {
    try {
      const { data } = await api.get('/calls/active');
      const hasCall = !!data.call_id;
      set({
        activeCall: hasCall ? data : null,
        transcriptSegments: data.transcript_segments || [],
      });
      // Restore symptoms from backend so they survive page refresh
      if (hasCall) {
        try {
          const symRes = await api.get(`/calls/${data.call_id}/symptoms`);
          set({ symptoms: symRes.data || [] });
        } catch {}
      }
    } catch {}
  },

  fetchSuggestions: async (callId) => {
    try {
      const { data } = await api.get(`/calls/${callId}/suggestions`);
      // DB format already uses suggestion_text / confidence_score — use as-is
      set({ suggestions: data.suggestions || [] });
    } catch {}
  },

  addTranscriptSegment: (segment) =>
    set((s) => ({ transcriptSegments: [...s.transcriptSegments, segment] })),

  addSuggestion: (suggestion) =>
    set((s) => ({ suggestions: [suggestion, ...s.suggestions] })),
  setSuggestions: (suggestions) => set({ suggestions }),

  openDispatchModal: (opts = {}) => set({ dispatchModalOpen: true, dispatchUrgency: opts.urgency || 'scheduled' }),
  closeDispatchModal: () => set({ dispatchModalOpen: false }),

  openPostCall: () => set({ postCallOpen: true }),
  closePostCall: () => set({ postCallOpen: false }),

  symptoms: [],
  callNotes: '',
  addSymptomLocal: (symptom) => set((s) => ({ symptoms: [...s.symptoms, symptom] })),
  removeSymptomLocal: (id) => set((s) => ({ symptoms: s.symptoms.filter(x => x.id !== id) })),
  setCallNotes: (callNotes) => set({ callNotes }),
  appendCallNotes: (text) => set((s) => ({
    callNotes: s.callNotes ? `${s.callNotes}\n${text}` : text,
  })),

  clearCall: () => set({
    activeCall: null,
    suggestions: [],
    transcriptSegments: [],
    symptoms: [],
    callNotes: '',
    dispatchModalOpen: false,
    postCallOpen: true,
  }),
})});

