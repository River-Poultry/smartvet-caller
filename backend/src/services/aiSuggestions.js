import { query } from '../db/index.js';
import { queryKnowledgeBase } from './smartvetCore.js';
import { diagnoseFromSymptoms, buildDiagnosisSummary } from './diseaseDiagnosis.js';
import { claudeDiagnose } from './claudeDiagnosis.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const EMERGENCY_KEYWORDS = [
  'dying', 'dead', 'mortality', 'many dead', 'all dying', 'emergency',
  'suddenly', 'collapsed', 'not moving', 'bleeding', 'haemorrhage',
  'gangrenous', 'dark skin', 'over 30%', 'critical', 'convulsions', 'paddling',
  '15-30%', '15–30%', 'flip over', 'flip-over', 'on their back', 'found on back',
];

const DISEASE_KEYWORDS = [
  'diarrhea', 'not eating', 'sneezing', 'coughing', 'swollen', 'limping',
  'ruffled feathers', 'drooping', 'watery eyes', 'paralysis', 'twisted neck',
  'gasping', 'lesions', 'scabs', 'nasal discharge', 'rattling', 'gurgling',
  'pale comb', 'blue comb', 'blood', 'whitish', 'huddling', 'depression',
  'water belly', 'ascites', 'flip over', 'on back', 'on belly', 'star gazing',
  'tremors', 'incoordination', 'gangrenous', 'anaemic', 'anemic', 'pale birds',
  'wet litter', 'footpad', 'breast blister', 'poor weight', 'uneven flock',
  'cloacal pasting', 'mortality', 'gradual deaths', 'sudden death',
];

const VET_REQUEST_KEYWORDS = [
  'vet', 'doctor', 'visit', 'come', 'check', 'diagnose', 'vaccination'
];

function buildClaudeSummary(diagnoses, symptoms) {
  if (!diagnoses.length) return null;
  const top = diagnoses[0];
  const isEmergency = diagnoses.some(d => d.is_emergency);
  const isZoonotic = diagnoses.some(d => d.is_zoonotic);
  const prefix = isEmergency ? '⚠️ EMERGENCY: ' : '';

  const lines = [
    `${prefix}AI Diagnosis (Claude) for [${symptoms.join(', ')}]:`,
    '',
    ...diagnoses.map((d, i) =>
      `${i + 1}. **${d.name}** — ${Math.round((d.confidence || 0) * 100)}% confidence` +
      (d.is_zoonotic ? ' ⚠️ ZOONOTIC' : '') +
      (d.is_notifiable ? ' 🚨 NOTIFIABLE' : '')
    ),
    '',
    `Treatment: ${top.treatment}`,
    `Prevention: ${top.prevention}`,
  ];

  if (isZoonotic) lines.push('', '⚠️ This disease can spread to humans. Advise farmer to wear gloves and wash hands.');
  return lines.join('\n');
}

function detectIntent(text) {
  const lower = text.toLowerCase();
  if (EMERGENCY_KEYWORDS.some(k => lower.includes(k))) return { intent: 'disease_diagnosis', isEmergency: true };
  if (DISEASE_KEYWORDS.some(k => lower.includes(k))) return { intent: 'disease_diagnosis', isEmergency: false };
  if (VET_REQUEST_KEYWORDS.some(k => lower.includes(k))) return { intent: 'vet_request', isEmergency: false };
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) return { intent: 'pricing_question', isEmergency: false };
  if (lower.includes('vaccine') || lower.includes('vaccination')) return { intent: 'vaccination_inquiry', isEmergency: false };
  return { intent: 'other', isEmergency: false };
}

function extractKeywordSymptoms(text) {
  return DISEASE_KEYWORDS.filter(k => text.toLowerCase().includes(k));
}

function extractAnimalType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('broiler')) return 'broiler';
  if (lower.includes('layer')) return 'layer';
  if (lower.includes('chick')) return 'chick';
  return 'poultry';
}

export async function generateSuggestions(callId, transcriptText, trackedSymptoms = []) {
  try {
    const { intent, isEmergency } = detectIntent(transcriptText);
    const keywordSymptoms = extractKeywordSymptoms(transcriptText);
    const animalType = extractAnimalType(transcriptText);

    const allSymptoms = [...new Set([...trackedSymptoms, ...keywordSymptoms])];

    const suggestions = [];

    if ((intent === 'disease_diagnosis' || allSymptoms.length > 0)) {
      // Try Claude first; fall back to keyword engine if API key absent or Claude fails
      let localDiagnoses = null;
      let usedClaude = false;

      if (env.geminiApiKey && allSymptoms.length > 0) {
        try {
          const claudeResult = await claudeDiagnose(allSymptoms, transcriptText, animalType);
          if (claudeResult?.diagnoses?.length) {
            localDiagnoses = claudeResult.diagnoses;
            usedClaude = true;
          }
        } catch (e) {
          logger.warn('Claude diagnosis skipped, using keyword engine', { error: e.message });
        }
      }

      if (!localDiagnoses) {
        localDiagnoses = diagnoseFromSymptoms(allSymptoms, transcriptText, animalType);
      }

      if (localDiagnoses.length > 0) {
        const diagnosisText = usedClaude
          ? buildClaudeSummary(localDiagnoses, allSymptoms)
          : buildDiagnosisSummary(localDiagnoses, allSymptoms);
        const topDiagnosis = localDiagnoses[0];
        const anyEmergency = localDiagnoses.some(d => d.is_emergency) || isEmergency;
        const anyNotifiable = localDiagnoses.some(d => d.is_notifiable);

        suggestions.push({
          callId,
          category: 'disease_diagnosis',
          text: diagnosisText,
          confidence: topDiagnosis.confidence,
          diagnoses: localDiagnoses,
          actions: [
            anyEmergency || anyNotifiable
              ? { label: '🚨 Emergency Vet Dispatch', action: 'open_dispatch_modal', urgency: 'emergency' }
              : { label: '📋 Schedule Vet Visit', action: 'open_dispatch_modal', urgency: 'scheduled' },
            { label: '📖 View Treatment Guide', action: 'show_treatment', disease: topDiagnosis.name },
          ],
        });

        if (anyNotifiable) {
          suggestions.push({
            callId,
            category: 'escalation_alert',
            text: '🚨 NOTIFIABLE DISEASE SUSPECTED\n\nSerious notifiable disease indicators detected.\n\n• Quarantine the farm immediately\n• Do NOT move birds or equipment\n• Contact District Veterinary Officer now\n• Log this call for authorities',
            confidence: 0.95,
            actions: [
              { label: '🚨 Emergency Dispatch', action: 'open_dispatch_modal', urgency: 'emergency' },
              { label: '📞 Call DVS Hotline', action: 'call', phone: '0800-100-066' },
            ],
          });
        }
      } else if (allSymptoms.length > 0) {
        suggestions.push({
          callId,
          category: 'disease_diagnosis',
          text: `Symptoms reported: ${allSymptoms.join(', ')}.\n\nInsufficient symptoms for confident diagnosis. Ask farmer:\n• How many birds are affected?\n• How long has this been happening?\n• Any recent feed or water changes?\n• Were birds recently vaccinated?`,
          confidence: 0.3,
          actions: [{ label: 'Request Vet Visit', action: 'open_dispatch_modal', urgency: 'scheduled' }],
        });
      }

      if (allSymptoms.length > 0) {
        queryKnowledgeBase({ symptoms: allSymptoms.join(','), animalType })
          .then(kbResult => {
            if (kbResult?.diagnoses?.length) {
              query(
                `INSERT INTO ai_suggestions (call_id, suggestion_text, category, confidence_score, actions)
                 VALUES ($1, $2, $3, $4, $5)`,
                [callId,
                 `SmartVet KB: ${kbResult.diagnoses[0].name} — ${kbResult.diagnoses[0].treatment_summary}`,
                 'disease_diagnosis', kbResult.diagnoses[0].confidence,
                 JSON.stringify([{ label: 'View KB Article', action: 'open_kb' }])]
              ).catch(() => {});
            }
          })
          .catch(() => {});
      }

      if (isEmergency && !suggestions.some(s => s.category === 'escalation_alert')) {
        suggestions.push({
          callId,
          category: 'escalation_alert',
          text: '⚠️ HIGH MORTALITY INDICATORS\n\nFarmer reports birds dying. This may be an emergency.\n\n• Ask: how many birds dead?\n• Ask: how quickly did it start?\n• Dispatch nearest available vet immediately',
          confidence: 0.9,
          actions: [{ label: '🚨 Emergency Dispatch', action: 'open_dispatch_modal', urgency: 'emergency' }],
        });
      }
    }

    if (intent === 'vet_request' && !suggestions.length) {
      suggestions.push({
        callId,
        category: 'general_advice',
        text: 'Farmer is requesting a vet visit. Collect:\n• Farm name and location\n• Number of birds affected\n• Main symptoms observed\n• Urgency level',
        confidence: 0.9,
        actions: [{ label: '📋 Schedule Vet Visit', action: 'open_dispatch_modal', urgency: 'scheduled' }],
      });
    }

    if (intent === 'vaccination_inquiry') {
      suggestions.push({
        callId,
        category: 'vaccination',
        text: 'Vaccination schedule reminder:\n• Day 1: Newcastle + IB (eye drop)\n• Day 7: Gumboro (drinking water)\n• Day 14: Gumboro booster\n• Day 21: Newcastle booster\n• Day 28: Fowl Typhoid\n• Day 35: Fowl Pox\n• Day 42: Final Newcastle booster',
        confidence: 0.95,
        actions: [],
      });
    }

    for (const s of suggestions) {
      await query(
        `INSERT INTO ai_suggestions (call_id, suggestion_text, category, confidence_score, actions)
         VALUES ($1, $2, $3, $4, $5)`,
        [callId, s.text, s.category, s.confidence, JSON.stringify(s.actions || [])]
      );
    }

    const anyEmergency = isEmergency || suggestions.some(s => s.category === 'escalation_alert');
    if (intent !== 'other' || allSymptoms.length > 0) {
      await query(
        `UPDATE calls SET call_intent = $1, is_emergency = $2 WHERE id = $3`,
        [intent === 'other' ? 'disease_diagnosis' : intent, anyEmergency, callId]
      );
    }

    return suggestions;
  } catch (err) {
    logger.error('AI suggestion generation failed', { callId, error: err.message });
    return [];
  }
}
