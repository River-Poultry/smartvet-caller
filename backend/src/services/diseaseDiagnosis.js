/**
 * Local offline disease diagnosis engine for poultry.
 * Maps symptom combinations → differential diagnoses with confidence scoring.
 */

const DISEASE_DB = [
  {
    name: 'Newcastle Disease (ND)',
    keywords: ['twisted neck', 'torticollis', 'circling', 'paralysis', 'respiratory distress',
               'gasping', 'coughing', 'sneezing', 'green diarrhea', 'diarrhea', 'sudden death',
               'dying', 'many dead', 'dead', 'mortality', 'nervous signs'],
    weight: { twisted_neck: 3, paralysis: 2.5, gasping: 2, sudden_death: 2.5, green_diarrhea: 2 },
    emergency: true,
    treatment: 'No specific treatment. Vaccinate survivors with Newcastle I2 vaccine. Isolate flock, notify authorities. Supportive care with electrolytes and vitamins.',
    prevention: 'Newcastle Disease vaccine at day 1 (eye drop), day 7 (drinking water), day 21 booster.',
    zoonotic: false,
  },
  {
    name: 'Gumboro Disease (IBD)',
    keywords: ['diarrhea', 'whitish diarrhea', 'watery diarrhea', 'ruffled feathers',
               'not eating', 'depression', 'huddling', 'picking at vent', 'sudden death',
               'mortality', 'trembling', 'immunosuppression'],
    weight: { diarrhea: 2, whitish_diarrhea: 3, ruffled_feathers: 1.5, huddling: 1.5, picking_vent: 2.5 },
    emergency: true,
    treatment: 'No specific treatment. Increase vitamin C and electrolytes. Keep warm. Vaccinate at day 14–18 (Gumboro vaccine). Mortality peaks 3–5 days then declines.',
    prevention: 'Gumboro vaccine at day 14 and day 21 booster. Clean and disinfect properly between flocks.',
    zoonotic: false,
  },
  {
    name: 'Fowl Typhoid / Salmonellosis',
    keywords: ['diarrhea', 'green diarrhea', 'yellow diarrhea', 'sulphur yellow droppings',
               'not eating', 'depression', 'ruffled feathers', 'sudden death', 'swollen head',
               'pale comb', 'mortality'],
    weight: { yellow_diarrhea: 3, sulphur_droppings: 3, swollen_head: 2, pale_comb: 2 },
    emergency: false,
    treatment: 'Enrofloxacin or Doxycycline in drinking water for 5 days. Remove dead birds promptly. Disinfect feeders and drinkers.',
    prevention: 'Fowl Typhoid vaccine at day 28. Buy chicks from reputable hatcheries (Salmonella-free).',
    zoonotic: true,
  },
  {
    name: 'Fowl Pox',
    keywords: ['scabs', 'lesions', 'warts', 'pustules', 'swollen eye', 'watery eyes',
               'mouth lesions', 'breathing difficulty', 'not eating', 'diphtheric lesions'],
    weight: { scabs: 3, lesions: 3, warts: 3, pustules: 3, mouth_lesions: 3.5 },
    emergency: false,
    treatment: 'No specific treatment. Apply antiseptic to skin lesions (iodine/gentian violet). For wet form (mouth lesions), remove diphtheritic membranes carefully. Supportive antibiotics to prevent secondary infection.',
    prevention: 'Fowl Pox vaccine at day 35 (wing-web stab method). Control mosquitoes.',
    zoonotic: false,
  },
  {
    name: 'Infectious Bronchitis (IB)',
    keywords: ['coughing', 'sneezing', 'gasping', 'nasal discharge', 'rattling', 'wheezing',
               'watery eyes', 'reduced egg production', 'egg quality poor', 'laboured breathing'],
    weight: { gasping: 2, rattling: 2.5, wheezing: 2.5, nasal_discharge: 2 },
    emergency: false,
    treatment: 'No specific treatment. Broad-spectrum antibiotics (Oxytetracycline) to control secondary bacterial infections. Improve ventilation. Vitamin A supplementation.',
    prevention: 'IB vaccine at day 1 combined with Newcastle. H120 strain vaccine most common.',
    zoonotic: false,
  },
  {
    name: 'Marek\'s Disease',
    keywords: ['paralysis', 'leg weakness', 'wing drooping', 'limping', 'twisted neck',
               'weight loss', 'grey eye', 'blindness', 'skin tumours', 'not moving'],
    weight: { paralysis: 3, leg_weakness: 2.5, wing_drooping: 2.5, grey_eye: 3 },
    emergency: false,
    treatment: 'No cure. Cull severely affected birds. Vaccinate at day 1 (Marek\'s HVT vaccine given at hatchery). Improve biosecurity.',
    prevention: 'Marek\'s vaccine must be administered at the hatchery on day 1 before exposure.',
    zoonotic: false,
  },
  {
    name: 'Coccidiosis',
    keywords: ['bloody diarrhea', 'blood in droppings', 'diarrhea', 'lethargy', 'not eating',
               'ruffled feathers', 'pale skin', 'huddling', 'depression', 'weight loss'],
    weight: { bloody_diarrhea: 3.5, blood_droppings: 3.5, pale_skin: 2, huddling: 1.5 },
    emergency: false,
    treatment: 'Amprolium (Corid) or Toltrazuril in drinking water for 3–5 days. Improve litter management and hygiene. Add vitamin K to reduce bleeding.',
    prevention: 'Keep litter dry. Use coccidiostats in feed. Vaccination available for breeders.',
    zoonotic: false,
  },
  {
    name: 'Chronic Respiratory Disease (CRD / Mycoplasma)',
    keywords: ['coughing', 'sneezing', 'nasal discharge', 'rattling', 'swollen face',
               'watery eyes', 'breathing difficulty', 'swollen sinuses', 'gurgling'],
    weight: { swollen_face: 2.5, swollen_sinuses: 3, nasal_discharge: 2, gurgling: 2.5 },
    emergency: false,
    treatment: 'Tylosin, Enrofloxacin or Doxycycline for 5–7 days. Treat entire flock. Improve ventilation and reduce ammonia levels in house.',
    prevention: 'Source mycoplasma-free chicks. Good ventilation. Reduce stocking density.',
    zoonotic: false,
  },
  {
    name: 'Egg Drop Syndrome (EDS)',
    keywords: ['reduced egg production', 'thin shell eggs', 'soft shell', 'no shell', 'pale eggs',
               'egg quality poor', 'drop in production'],
    weight: { thin_shell: 3, soft_shell: 3, pale_eggs: 2.5, egg_drop: 3 },
    emergency: false,
    treatment: 'No specific treatment. Vaccination is the only control. Supportive vitamins and minerals. Cull poor performers.',
    prevention: 'EDS vaccine before point of lay.',
    zoonotic: false,
  },
  {
    name: 'Avian Influenza (AI)',
    keywords: ['sudden death', 'dying', 'many dead', 'mortality', 'swollen head',
               'blue comb', 'coughing', 'sneezing', 'bleeding', 'haemorrhage',
               'nasal discharge', 'respiratory distress', 'emergency'],
    weight: { sudden_death: 3, swollen_head: 3, blue_comb: 3.5, haemorrhage: 3.5, mortality: 2 },
    emergency: true,
    treatment: 'NOTIFIABLE DISEASE — contact veterinary authorities immediately. Quarantine farm. Do NOT move birds or equipment.',
    prevention: 'Strict biosecurity. Avoid contact with wild birds. AI vaccination where legally permitted.',
    zoonotic: true,
    notifiable: true,
  },
];

// Symptom normalisation map — maps user phrases → canonical tags
const SYMPTOM_MAP = {
  'twisted neck': 'twisted_neck', 'torticollis': 'twisted_neck', 'head twisted': 'twisted_neck',
  'paralysis': 'paralysis', 'can\'t walk': 'paralysis', 'cannot walk': 'paralysis', 'not moving': 'paralysis',
  'diarrhea': 'diarrhea', 'loose droppings': 'diarrhea', 'watery droppings': 'diarrhea', 'loose stool': 'diarrhea',
  'green diarrhea': 'green_diarrhea', 'greenish droppings': 'green_diarrhea',
  'bloody diarrhea': 'bloody_diarrhea', 'blood in droppings': 'blood_droppings', 'red droppings': 'bloody_diarrhea',
  'yellow diarrhea': 'yellow_diarrhea', 'sulphur droppings': 'sulphur_droppings',
  'whitish diarrhea': 'whitish_diarrhea', 'white diarrhea': 'whitish_diarrhea',
  'coughing': 'coughing', 'cough': 'coughing',
  'sneezing': 'sneezing', 'sneeze': 'sneezing',
  'gasping': 'gasping', 'gasping for air': 'gasping', 'open mouth breathing': 'gasping',
  'ruffled feathers': 'ruffled_feathers', 'feathers ruffled': 'ruffled_feathers', 'puffed up': 'ruffled_feathers',
  'not eating': 'not_eating', 'off feed': 'not_eating', 'refusing food': 'not_eating', 'loss of appetite': 'not_eating',
  'sudden death': 'sudden_death', 'suddenly died': 'sudden_death', 'dead without signs': 'sudden_death',
  'dying': 'sudden_death', 'dead': 'sudden_death', 'many dead': 'sudden_death', 'mortality': 'mortality',
  'swollen head': 'swollen_head', 'head swollen': 'swollen_head',
  'swollen face': 'swollen_face', 'swollen sinuses': 'swollen_sinuses',
  'watery eyes': 'watery_eyes', 'eye discharge': 'watery_eyes', 'runny eyes': 'watery_eyes',
  'scabs': 'scabs', 'lesions': 'lesions', 'warts': 'warts', 'pustules': 'pustules',
  'mouth lesions': 'mouth_lesions', 'lesions in mouth': 'mouth_lesions',
  'limping': 'limping', 'leg weakness': 'leg_weakness', 'weak legs': 'leg_weakness',
  'wing drooping': 'wing_drooping', 'drooping wings': 'wing_drooping',
  'nasal discharge': 'nasal_discharge', 'runny nose': 'nasal_discharge',
  'rattling': 'rattling', 'gurgling': 'gurgling', 'wheezing': 'wheezing',
  'pale comb': 'pale_comb', 'blue comb': 'blue_comb', 'dark comb': 'blue_comb',
  'pale skin': 'pale_skin', 'grey eye': 'grey_eye',
  'weight loss': 'weight_loss', 'thin birds': 'weight_loss',
  'huddling': 'huddling', 'huddled together': 'huddling',
  'bleeding': 'haemorrhage', 'haemorrhage': 'haemorrhage',
  'picking vent': 'picking_vent', 'vent picking': 'picking_vent',
  'depression': 'depression', 'lethargic': 'depression', 'lethargy': 'depression', 'inactive': 'depression',
  'reduced egg production': 'egg_drop', 'drop in eggs': 'egg_drop', 'few eggs': 'egg_drop',
  'thin shell': 'thin_shell', 'soft shell': 'soft_shell', 'thin shelled eggs': 'thin_shell',
};

function normaliseSymptoms(symptoms) {
  // symptoms is an array of strings (from symptomTracker) or a comma-separated string
  const raw = Array.isArray(symptoms)
    ? symptoms.map(s => s.toLowerCase().trim())
    : symptoms.toLowerCase().split(',').map(s => s.trim());

  const tags = new Set();
  for (const s of raw) {
    // direct match
    if (SYMPTOM_MAP[s]) { tags.add(SYMPTOM_MAP[s]); continue; }
    // partial match
    for (const [phrase, tag] of Object.entries(SYMPTOM_MAP)) {
      if (s.includes(phrase) || phrase.includes(s)) tags.add(tag);
    }
    // pass through cleaned symptom as tag
    tags.add(s.replace(/\s+/g, '_'));
  }
  return tags;
}

function scoreDisease(disease, symptomTags, textLower) {
  let score = 0;
  let matched = [];

  // keyword match from full text
  for (const kw of disease.keywords) {
    if (textLower.includes(kw)) {
      score += 1;
      matched.push(kw);
    }
  }

  // weighted symptom tag match
  for (const [tag, weight] of Object.entries(disease.weight || {})) {
    if (symptomTags.has(tag)) {
      score += weight;
      if (!matched.includes(tag.replace(/_/g, ' '))) matched.push(tag.replace(/_/g, ' '));
    }
  }

  return { score, matched };
}

/**
 * Diagnose from symptoms array + optional free text.
 * Returns top 3 differential diagnoses sorted by confidence.
 */
export function diagnoseFromSymptoms(symptoms, freeText = '', birdType = 'poultry') {
  if (!symptoms?.length && !freeText) return [];

  const symptomTags = normaliseSymptoms(symptoms);
  const textLower = (freeText + ' ' + symptoms.join(' ')).toLowerCase();

  const scored = DISEASE_DB.map(disease => {
    const { score, matched } = scoreDisease(disease, symptomTags, textLower);
    return { disease, score, matched };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];

  const maxScore = scored[0].score;

  return scored.slice(0, 3).map(({ disease, score, matched }) => ({
    name: disease.name,
    confidence: Math.min(0.98, score / (maxScore + 2)),
    matched_symptoms: matched,
    treatment: disease.treatment,
    prevention: disease.prevention,
    is_emergency: disease.emergency,
    is_zoonotic: disease.zoonotic || false,
    is_notifiable: disease.notifiable || false,
  }));
}

/**
 * Generate plain-text diagnosis summary for injection into AI suggestions.
 */
export function buildDiagnosisSummary(diagnoses, symptoms) {
  if (!diagnoses.length) return null;

  const top = diagnoses[0];
  const isEmergency = diagnoses.some(d => d.is_emergency);
  const isNotifiable = diagnoses.some(d => d.is_notifiable);
  const isZoonotic = diagnoses.some(d => d.is_zoonotic);

  let prefix = '';
  if (isNotifiable) prefix = '🚨 NOTIFIABLE DISEASE SUSPECTED: ';
  else if (isEmergency) prefix = '⚠️ EMERGENCY: ';

  const lines = [
    `${prefix}AI Diagnosis for reported symptoms [${symptoms.join(', ')}]:`,
    '',
    ...diagnoses.map((d, i) =>
      `${i + 1}. **${d.name}** — ${Math.round(d.confidence * 100)}% confidence` +
      (d.matched_symptoms.length ? ` (matched: ${d.matched_symptoms.slice(0, 3).join(', ')})` : '') +
      (d.is_zoonotic ? ' ⚠️ ZOONOTIC' : '') +
      (d.is_notifiable ? ' 🚨 NOTIFIABLE' : '')
    ),
    '',
    `Treatment: ${top.treatment}`,
    `Prevention: ${top.prevention}`,
  ];

  if (isNotifiable) {
    lines.push('', '🚨 LEGAL REQUIREMENT: Report to District Veterinary Officer immediately.');
  }
  if (isZoonotic) {
    lines.push('', '⚠️ This disease can spread to humans. Advise farmer to wear gloves and wash hands.');
  }

  return lines.join('\n');
}
