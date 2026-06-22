import { useEffect, useRef } from 'react';
import { useCallStore } from '../../store/callStore.js';

export function RealTimeTranscript() {
  const { transcriptSegments, activeCall } = useCallStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptSegments]);

  if (!activeCall) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        Transcript will appear here during an active call
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Transcript</span>
        {activeCall && (
          <span className="flex items-center gap-1.5 text-xs text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Recording
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
        {transcriptSegments.length === 0 && (
          <p className="text-gray-400 text-xs italic text-center pt-4">Transcription in progress…</p>
        )}
        {transcriptSegments.map((seg, i) => (
          <div key={i} className={`flex gap-2 ${seg.speaker === 'agent' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
              seg.speaker === 'farmer'
                ? 'bg-gray-100 text-gray-800 border border-gray-200'
                : 'bg-green-700 text-white'
            }`}>
              <span className={`block text-[10px] mb-1 font-semibold ${seg.speaker === 'farmer' ? 'text-gray-400' : 'text-green-100'}`}>
                {seg.speaker === 'farmer' ? '👨‍🌾 Farmer' : '🎧 Agent'}
              </span>
              {seg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
