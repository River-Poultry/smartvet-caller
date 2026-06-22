import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const SYSTEM_PROMPT = `You are an expert poultry veterinarian with 20+ years of field experience in Sub-Saharan Africa, specialising in smallholder and commercial poultry health. You help call centre agents diagnose poultry diseases over the phone.

Given a farmer's reported symptoms, you must return a JSON object (no markdown, no prose — raw JSON only) with this exact structure:
{
  "diagnoses": [
    {
      "name": "Disease Name",
      "confidence": 0.85,
      "matched_symptoms": ["symptom1", "symptom2"],
      "treatment": "Specific treatment steps",
      "prevention": "Prevention advice",
      "is_emergency": false,
      "is_zoonotic": false,
      "is_notifiable": false
    }
  ],
  "follow_up_questions": ["Question to ask farmer?"],
  "summary": "One-sentence plain-English summary for the agent"
}

Rules:
- Return 1–3 differential diagnoses, most likely first
- confidence is 0.0–1.0; be conservative — do not exceed 0.95
- is_emergency: true for Newcastle, Gumboro peak mortality, Coccidiosis with heavy bleeding
- is_notifiable: false (Avian Influenza is excluded from your scope — if symptoms strongly suggest AI, note it in treatment and recommend immediate DVS contact)
- is_zoonotic: true for Salmonella/Fowl Typhoid
- treatment and prevention must be practical for African smallholder farmers
- follow_up_questions: 2–3 questions that would help confirm the top diagnosis`;

let client = null;

function getClient() {
  if (!env.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

export async function claudeDiagnose(symptoms, freeText = '', birdType = 'poultry') {
  const anthropic = getClient();
  if (!anthropic) return null;

  const symptomList = Array.isArray(symptoms) ? symptoms.join(', ') : symptoms;
  const userMessage = [
    `Bird type: ${birdType}`,
    symptomList ? `Reported symptoms: ${symptomList}` : '',
    freeText ? `Farmer's description: ${freeText}` : '',
  ].filter(Boolean).join('\n');

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const msg = await stream.finalMessage();
    const textBlock = msg.content.find(b => b.type === 'text');
    if (!textBlock) return null;

    const parsed = JSON.parse(textBlock.text);
    return parsed;
  } catch (err) {
    logger.error('Claude diagnosis failed', { error: err.message });
    return null;
  }
}
