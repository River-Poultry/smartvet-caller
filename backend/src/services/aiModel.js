/**
 * Pluggable AI model service.
 * Set AI_MODEL_URL in .env to point to your own model endpoint.
 * Falls back to the local diseaseDiagnosis engine when not configured.
 */
import { diagnoseFromSymptoms, buildDiagnosisSummary } from './diseaseDiagnosis.js';
import { logger } from '../config/logger.js';

const AI_MODEL_URL = process.env.AI_MODEL_URL || '';
const AI_MODEL_KEY = process.env.AI_MODEL_KEY || '';

/**
 * Query the AI model (or fallback) with a free-text question or symptom list.
 * Returns: { answer, diagnoses, source }
 */
export async function queryAIModel({ question, symptoms = [], bird_type = 'chicken', context = '' }) {
  // If a model URL is configured, proxy to it
  if (AI_MODEL_URL) {
    try {
      const res = await fetch(AI_MODEL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(AI_MODEL_KEY ? { 'Authorization': `Bearer ${AI_MODEL_KEY}` } : {}),
        },
        body: JSON.stringify({ question, symptoms, bird_type, context }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`AI model ${res.status}`);
      const data = await res.json();

      return {
        answer: data.answer || data.response || data.text || '',
        diagnoses: data.diagnoses || [],
        drug_suggestions: data.drug_suggestions || [],
        source: 'external_model',
        model_name: data.model || AI_MODEL_URL,
      };
    } catch (err) {
      logger.warn('External AI model failed, falling back to local engine', { error: err.message });
    }
  }

  // Local fallback — offline diagnosis engine
  const allText = [question, ...symptoms].join(' ');
  const diagnoses = diagnoseFromSymptoms(symptoms, allText, bird_type);
  const summary = buildDiagnosisSummary(diagnoses, symptoms);

  return {
    answer: summary,
    diagnoses,
    drug_suggestions: [],
    source: 'local_engine',
    model_name: 'SmartVet Local Prescription Engine v1',
  };
}

export function isExternalModelConfigured() {
  return !!AI_MODEL_URL;
}
