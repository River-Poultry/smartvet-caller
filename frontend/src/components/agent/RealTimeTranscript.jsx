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
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-sm font-medium text-gray-400">Live Transcript</span>
        {activeCall && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Recording
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {transcriptSegments.length === 0 && (
          <p className="text-gray-600 text-sm italic">Transcription in progress…</p>
        )}
        {transcriptSegments.map((seg, i) => (
          <div key={i} className={`flex gap-2 ${seg.speaker === 'agent' ? 'justify-end' : ''}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              seg.speaker === 'farmer'
                ? 'bg-gray-800 text-gray-200'
                : 'bg-green-900/60 text-green-100'
            }`}>
              <span className={`block text-xs mb-1 font-medium ${seg.speaker === 'farmer' ? 'text-gray-400' : 'text-green-400'}`}>
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
