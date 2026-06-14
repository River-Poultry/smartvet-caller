import fetch from 'node-fetch';

const AI_MODEL_API_URL = process.env.AI_MODEL_API_URL;
const AI_MODEL_API_KEY = process.env.AI_MODEL_API_KEY;

function isConfigured() {
  return Boolean(AI_MODEL_API_URL) && !AI_MODEL_API_URL.includes('your-ai-model-endpoint');
}

async function callModel(prompt, options = {}) {
  if (!isConfigured()) {
    const error = new Error('AI model endpoint is not configured. Set AI_MODEL_API_URL and AI_MODEL_API_KEY in backend/.env');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(AI_MODEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AI_MODEL_API_KEY ? { Authorization: `Bearer ${AI_MODEL_API_KEY}` } : {}),
    },
    body: JSON.stringify({ prompt, ...options }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI model request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.response ?? data.output ?? data.text ?? JSON.stringify(data);
}

export async function askAssistant(question, context = '') {
  const prompt = context
    ? `Context:\n${context}\n\nAgent question: ${question}\n\nProvide a concise, practical answer for a call center agent assisting a farmer or paravet.`
    : `Agent question: ${question}\n\nProvide a concise, practical answer for a call center agent assisting a farmer or paravet.`;

  return callModel(prompt, { task: 'qa' });
}

export async function summarizeTranscript(transcript) {
  const prompt = `Summarize the following call transcript between a call center agent and a farmer. Extract: animal type, reported symptoms/issue, location, urgency level, and recommended next action. Transcript:\n\n${transcript}`;

  return callModel(prompt, { task: 'summarize' });
}

export { isConfigured };
