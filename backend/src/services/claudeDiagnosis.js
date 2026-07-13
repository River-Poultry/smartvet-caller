import { GoogleGenerativeAI } from '@google/generative-ai';
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
- is_notifiable: true only for diseases legally notifiable in Uganda/Ghana/Kenya (not Avian Influenza — flag in treatment text instead and recommend DVS contact)
- is_zoonotic: true for Salmonella/Fowl Typhoid
- treatment and prevention must be practical for African smallholder farmers
- follow_up_questions: 2–3 questions that would help confirm the top diagnosis`;

let genAI = null;

function getClient() {
  if (!env.geminiApiKey) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(env.geminiApiKey);
  return genAI;
}

export async function claudeDiagnose(symptoms, freeText = '', birdType = 'poultry', flockDetails = {}) {
  const client = getClient();
  if (!client) return null;

  const symptomList = Array.isArray(symptoms) ? symptoms.join(', ') : symptoms;
  const resolvedBirdType = flockDetails.birdType || birdType || 'poultry';

  const flockLines = [];
  if (flockDetails.ageValue && flockDetails.ageUnit) {
    flockLines.push(`Age: ${flockDetails.ageValue} ${flockDetails.ageUnit}`);
  }
  if (flockDetails.flockSize) flockLines.push(`Flock size: ${flockDetails.flockSize} birds`);
  if (flockDetails.deadCount) {
    const pct = flockDetails.flockSize
      ? ` (${((parseInt(flockDetails.deadCount) / parseInt(flockDetails.flockSize)) * 100).toFixed(1)}% mortality)`
      : '';
    flockLines.push(`Deaths: ${flockDetails.deadCount}${pct}`);
  }
  if (flockDetails.vaccinations?.length) {
    flockLines.push(`Vaccinated against: ${flockDetails.vaccinations.join(', ')}`);
  }

  const userMessage = [
    `Bird type: ${resolvedBirdType}`,
    flockLines.length ? `Flock details:\n${flockLines.map(l => `  - ${l}`).join('\n')}` : '',
    symptomList ? `Reported symptoms: ${symptomList}` : '',
    freeText ? `Farmer's description: ${freeText}` : '',
  ].filter(Boolean).join('\n');

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    logger.error('Gemini diagnosis failed', { error: err.message });
    return null;
  }
}
