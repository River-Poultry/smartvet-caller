import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export default function AiAssistant() {
  const [configured, setConfigured] = useState(true);
  const [context, setContext] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help you answer animal health questions, suggest next steps, and summarize calls. Ask me anything related to the current case.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.getAiStatus().then((s) => setConfigured(s.configured)).catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const question = input.trim();
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const { answer } = await api.askAi(question, context);
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err.message, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-3rem)]">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">AI Assistant</h1>

      {!configured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-sm mb-4">
          The AI model endpoint isn't configured yet. Set <code className="bg-amber-100 px-1 rounded">AI_MODEL_API_URL</code> and{' '}
          <code className="bg-amber-100 px-1 rounded">AI_MODEL_API_KEY</code> in <code className="bg-amber-100 px-1 rounded">backend/.env</code> to enable live responses.
        </div>
      )}

      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3"
        rows={2}
        placeholder="Optional: paste case context here (symptoms, animal type, location)..."
        value={context}
        onChange={(e) => setContext(e.target.value)}
      />

      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto mb-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-emerald-700 text-white'
                  : m.error
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Ask about symptoms, treatments, protocols..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
