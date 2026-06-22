import { create } from 'zustand';
import api from '../services/api.js';

export const useCallStore = create((set, get) => {
if (import.meta.env.DEV) window.__callStore__ = { setState: (s) => set(s) };
return ({
  activeCall: null,
  isMuted: false,
  isOnHold: false,
  suggestions: [],
  transcriptSegments: [],
  dispatchModalOpen: false,
  dispatchUrgency: 'scheduled',
  postCallOpen: false,
  loading: false,

  setActiveCall: (call) => set({ activeCall: call, isMuted: false, isOnHold: false }),

  toggleMute: async () => {
    const { activeCall, isMuted } = get();
    if (!activeCall?.call_id) return;
    const next = !isMuted;
    set({ isMuted: next });
    try {
      await api.patch(`/calls/${activeCall.call_id}/mute`, { muted: next });
    } catch {
      set({ isMuted: isMuted });
    }
  },

  toggleHold: async () => {
    const { activeCall, isOnHold } = get();
    if (!activeCall?.call_id) return;
    const next = !isOnHold;
    set({ isOnHold: next });
    try {
      await api.patch(`/calls/${activeCall.call_id}/hold`, { hold: next });
    } catch {
      set({ isOnHold: isOnHold });
    }
  },

  fetchActiveCall: async () => {
    try {
      const { data } = await api.get('/calls/active');
      const hasCall = !!data.call_id;
      set({
        activeCall: hasCall ? data : null,
        transcriptSegments: data.transcript_segments || [],
      });
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
  flockDetails: {
    birdType: '',
    ageValue: '',
    ageUnit: 'weeks',
    flockSize: '',
    deadCount: '',
    vaccinations: [],
  },

  addSymptomLocal: (symptom) => set((s) => ({ symptoms: [...s.symptoms, symptom] })),
  removeSymptomLocal: (id) => set((s) => ({ symptoms: s.symptoms.filter(x => x.id !== id) })),
  setCallNotes: (callNotes) => set({ callNotes }),
  appendCallNotes: (text) => set((s) => ({
    callNotes: s.callNotes ? `${s.callNotes}\n${text}` : text,
  })),
  setFlockDetails: (patch) => set((s) => ({ flockDetails: { ...s.flockDetails, ...patch } })),

  clearCall: () => set({
    activeCall: null,
    isMuted: false,
    isOnHold: false,
    suggestions: [],
    transcriptSegments: [],
    symptoms: [],
    callNotes: '',
    flockDetails: { birdType: '', ageValue: '', ageUnit: 'weeks', flockSize: '', deadCount: '', vaccinations: [] },
    dispatchModalOpen: false,
    postCallOpen: true,
  }),
})});

