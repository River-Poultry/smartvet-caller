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
    name: 'Sudden Death Syndrome / Flip-over (SDS)',
    keywords: ['found on back', 'flip over', 'flip-over', 'on their back', 'sudden death', 'no prior signs',
               'healthy bird', 'broiler', 'fast growing', 'heart failure', 'dead on back'],
    weight: { flip_over: 3.5, sudden_death: 2.5, fast_growing: 2, mortality_low: 1, mortality_mild: 1.5 },
    birdTypes: ['broiler', 'sasso'],
    maxAgeWeeks: 8,
    emergency: false,
    treatment: 'No treatment for affected birds — death is instantaneous. Reduce stress and stocking density. Reduce feed energy level or restrict feed. Ensure adequate ventilation. Losses typically 0.5–3% in broiler flocks.',
    prevention: 'Avoid very high energy diets in fast-growing broilers. Dim lighting to reduce activity. Ensure adequate vitamin E and selenium supplementation. Select slower-growing strains.',
    zoonotic: false,
  },
  {
    name: 'Ascites (Water Belly / Pulmonary Hypertension Syndrome)',
    keywords: ['water belly', 'ascites', 'pot belly', 'swollen abdomen', 'fluid abdomen', 'blue comb',
               'laboured breathing', 'broiler', 'fast growing', 'found on belly', 'prone'],
    weight: { ascites: 3.5, blue_comb: 2.5, gasping: 2, fast_growing: 2, prone_death: 2, poor_weight_gain: 1.5 },
    birdTypes: ['broiler', 'sasso'],
    emergency: false,
    treatment: 'No cure once clinical signs develop. Drain abdominal fluid to relieve distress (needle at lowest point of abdomen). Cull severely affected birds. Reduce dietary energy and growth rate.',
    prevention: 'Reduce stocking density and improve ventilation — low oxygen drives pulmonary hypertension. Restrict feed in first 2 weeks. Use vitamin C supplementation. Avoid dusty, ammonia-rich litter.',
    zoonotic: false,
  },
  {
    name: 'Gangrenous Dermatitis (Necrotic Dermatitis)',
    keywords: ['gangrenous', 'dark skin', 'black skin', 'necrotic skin', 'skin lesions', 'sudden death',
               'subcutaneous', 'wet gangrene', 'immunosuppressed'],
    weight: { gangrene: 3.5, sudden_death: 2, haemorrhage: 2, mortality_high: 2, mortality_moderate: 1.5 },
    emergency: true,
    treatment: 'Broad-spectrum antibiotics (Penicillin or Amoxicillin) for 5–7 days. Remove and incinerate dead birds immediately. Disinfect house thoroughly. Address any underlying immunosuppression (IBD, CAV).',
    prevention: 'Prevent skin wounds (sharp objects, cannibalism). Vaccinate against IBD and Marek\'s to prevent immunosuppression. Maintain clean dry litter. Reduce stocking density.',
    zoonotic: false,
  },
  {
    name: 'Infectious Anaemia (Chicken Anaemia Virus / CAV)',
    keywords: ['pale comb', 'anaemic', 'anemic', 'pale birds', 'depression', 'not eating', 'young chicks',
               'immunosuppression', 'mortality', 'feather loss', 'bone marrow'],
    weight: { anaemia: 3.5, pale_comb: 3, depression: 2, mortality_moderate: 2, feather_loss: 1.5, huddling: 1.5 },
    emergency: false,
    treatment: 'No specific antiviral treatment. Supportive care: vitamin supplements (B12, folic acid, iron), electrolytes, high-quality feed. Prevent secondary bacterial infections with antibiotics.',
    prevention: 'Vaccinate breeders so maternal antibodies protect chicks in first 3 weeks. Maintain strict biosecurity. Avoid immunosuppressive diseases (IBD, Marek\'s).',
    zoonotic: false,
  },
  {
    name: 'Egg Drop Syndrome (EDS)',
    keywords: ['reduced egg production', 'thin shell eggs', 'soft shell', 'no shell', 'pale eggs',
               'egg quality poor', 'drop in production'],
    weight: { thin_shell: 3, soft_shell: 3, pale_eggs: 2.5, egg_drop: 3 },
    birdTypes: ['layer'],
    minAgeWeeks: 18,
    emergency: false,
    treatment: 'No specific treatment. Vaccination is the only control. Supportive vitamins and minerals. Cull poor performers.',
    prevention: 'EDS vaccine before point of lay.',
    zoonotic: false,
  },
];

// Symptom normalisation map — maps user phrases → canonical tags
const SYMPTOM_MAP = {
  // Neck / nervous
  'twisted neck': 'twisted_neck', 'torticollis': 'twisted_neck', 'head twisted': 'twisted_neck',
  'star gazing': 'stargazing', 'star-gazing': 'stargazing', 'opisthotonus': 'stargazing', 'looking up': 'stargazing',
  'tremors': 'tremors', 'shaking': 'tremors', 'trembling': 'tremors',
  'convulsions': 'convulsions', 'seizures': 'convulsions', 'paddling': 'convulsions', 'paddling legs': 'convulsions',
  'incoordination': 'incoordination', 'falling over': 'incoordination', 'ataxia': 'incoordination',

  // Paralysis / mobility
  'paralysis': 'paralysis', 'can\'t walk': 'paralysis', 'cannot walk': 'paralysis', 'not moving': 'paralysis',
  'leg weakness': 'leg_weakness', 'weak legs': 'leg_weakness', 'cannot stand': 'leg_weakness',
  'limping': 'limping', 'lame': 'limping', 'lameness': 'limping',
  'wing drooping': 'wing_drooping', 'drooping wings': 'wing_drooping',
  'swollen hock': 'swollen_joints', 'swollen joints': 'swollen_joints', 'swollen hock joints': 'swollen_joints',
  'leg bowing': 'bone_deformity', 'angular deformity': 'bone_deformity', 'soft bones': 'bone_deformity',

  // Mortality pattern
  'sudden death': 'sudden_death', 'suddenly died': 'sudden_death', 'dead without signs': 'sudden_death',
  'dying': 'sudden_death', 'dead': 'sudden_death', 'many dead': 'sudden_death', 'mortality': 'mortality',
  'found dead on back': 'flip_over', 'found on back': 'flip_over', 'flip over': 'flip_over',
  'flip-over': 'flip_over', 'flip over sudden death': 'flip_over', 'on their back': 'flip_over',
  'found dead on belly': 'prone_death', 'found on belly': 'prone_death', 'on their belly': 'prone_death', 'prone': 'prone_death',
  'found dead on side': 'lateral_death', 'found on side': 'lateral_death', 'on their side': 'lateral_death',
  'gradual deaths': 'gradual_mortality', 'deaths over days': 'gradual_mortality',
  'death after brief illness': 'peracute_death', 'died within 24 hours': 'peracute_death',

  // Mortality rate
  'under 2% mortality': 'mortality_low', '2% mortality': 'mortality_low',
  '2–5% mortality': 'mortality_mild', '2-5% mortality': 'mortality_mild',
  '5–15% mortality': 'mortality_moderate', '5-15% mortality': 'mortality_moderate',
  '15–30% mortality': 'mortality_high', '15-30% mortality': 'mortality_high',
  'over 30% mortality': 'mortality_critical', 'high mortality': 'mortality_high',

  // Digestion
  'diarrhea': 'diarrhea', 'loose droppings': 'diarrhea', 'watery droppings': 'diarrhea', 'loose stool': 'diarrhea',
  'green diarrhea': 'green_diarrhea', 'greenish droppings': 'green_diarrhea',
  'bloody diarrhea': 'bloody_diarrhea', 'blood in droppings': 'blood_droppings', 'red droppings': 'bloody_diarrhea',
  'yellow diarrhea': 'yellow_diarrhea', 'sulphur droppings': 'sulphur_droppings', 'yellow droppings': 'yellow_diarrhea',
  'whitish diarrhea': 'whitish_diarrhea', 'white diarrhea': 'whitish_diarrhea', 'white droppings': 'whitish_diarrhea',
  'chalky droppings': 'whitish_diarrhea', 'cloacal pasting': 'cloacal_pasting', 'pasted vent': 'cloacal_pasting',
  'wet litter': 'wet_litter', 'wet bedding': 'wet_litter',
  'not eating': 'not_eating', 'off feed': 'not_eating', 'refusing food': 'not_eating', 'loss of appetite': 'not_eating',
  'reduced feed intake': 'not_eating',

  // Respiratory
  'coughing': 'coughing', 'cough': 'coughing',
  'sneezing': 'sneezing', 'sneeze': 'sneezing',
  'gasping': 'gasping', 'gasping for air': 'gasping', 'open mouth breathing': 'gasping',
  'laboured breathing': 'gasping', 'labored breathing': 'gasping', 'difficulty breathing': 'gasping',
  'nasal discharge': 'nasal_discharge', 'runny nose': 'nasal_discharge', 'nasal': 'nasal_discharge',
  'rattling': 'rattling', 'tracheal rales': 'rattling', 'rales': 'rattling',
  'gurgling': 'gurgling', 'wheezing': 'wheezing',
  'conjunctivitis': 'conjunctivitis', 'eye discharge': 'conjunctivitis', 'runny eyes': 'conjunctivitis',
  'watery eyes': 'watery_eyes', 'sunken eyes': 'watery_eyes',
  'head shaking': 'head_shaking',

  // Appearance
  'ruffled feathers': 'ruffled_feathers', 'feathers ruffled': 'ruffled_feathers', 'puffed up': 'ruffled_feathers',
  'feather loss': 'feather_loss', 'feathers falling': 'feather_loss',
  'pale comb': 'pale_comb', 'pale wattles': 'pale_comb',
  'blue comb': 'blue_comb', 'dark comb': 'blue_comb', 'purple comb': 'blue_comb',
  'pale skin': 'pale_skin', 'anaemic': 'anaemia', 'anemic': 'anaemia', 'pale birds': 'anaemia',
  'grey eye': 'grey_eye',
  'swollen head': 'swollen_head', 'head swollen': 'swollen_head',
  'swollen face': 'swollen_face', 'swollen sinuses': 'swollen_sinuses', 'puffy face': 'swollen_face',
  'swollen eye': 'swollen_eye', 'swollen eyelid': 'swollen_eye',
  'scabs': 'scabs', 'warts': 'warts', 'pustules': 'pustules', 'crusty lesions': 'scabs',
  'lesions': 'lesions', 'mouth lesions': 'mouth_lesions', 'lesions in mouth': 'mouth_lesions',
  'throat lesions': 'mouth_lesions', 'diphtheritic': 'mouth_lesions',
  'gangrenous': 'gangrene', 'dark skin patches': 'gangrene', 'black skin': 'gangrene', 'necrotic skin': 'gangrene',
  'bleeding': 'haemorrhage', 'haemorrhage': 'haemorrhage', 'subcutaneous bleeding': 'haemorrhage',

  // Broiler-specific
  'water belly': 'ascites', 'ascites': 'ascites', 'pot belly': 'ascites', 'fluid abdomen': 'ascites',
  'abdominal swelling': 'ascites', 'swollen abdomen': 'ascites',
  'breast blister': 'breast_blister',
  'footpad sores': 'footpad_lesion', 'footpad lesion': 'footpad_lesion', 'contact dermatitis': 'footpad_lesion',
  'poor weight gain': 'poor_weight_gain', 'not growing': 'poor_weight_gain', 'runting': 'poor_weight_gain',
  'uneven flock': 'uneven_flock', 'uneven flock size': 'uneven_flock', 'size variation': 'uneven_flock',
  'rapid growth': 'fast_growing', 'fast growing': 'fast_growing',

  // Production
  'reduced egg production': 'egg_drop', 'drop in eggs': 'egg_drop', 'few eggs': 'egg_drop',
  'sudden drop in production': 'egg_drop',
  'thin shell': 'thin_shell', 'soft shell': 'soft_shell', 'thin shelled eggs': 'thin_shell',
  'no shell eggs': 'no_shell', 'shell-less eggs': 'no_shell',
  'misshapen eggs': 'egg_deformity', 'watery albumen': 'egg_quality',

  // General
  'weight loss': 'weight_loss', 'thin birds': 'weight_loss',
  'huddling': 'huddling', 'huddled together': 'huddling',
  'depression': 'depression', 'lethargic': 'depression', 'lethargy': 'depression', 'inactive': 'depression',
  'picking vent': 'picking_vent', 'vent picking': 'picking_vent',
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
export function diagnoseFromSymptoms(symptoms, freeText = '', birdType = 'poultry', flockDetails = {}) {
  if (!symptoms?.length && !freeText) return [];

  const symptomTags = normaliseSymptoms(symptoms);
  const textLower = (freeText + ' ' + symptoms.join(' ')).toLowerCase();

  const resolvedBirdType = flockDetails.birdType || birdType || 'poultry';
  const vaccinations = flockDetails.vaccinations || [];

  // Convert age to weeks for gating
  let ageWeeks = null;
  if (flockDetails.ageValue && parseInt(flockDetails.ageValue) > 0) {
    const v = parseInt(flockDetails.ageValue);
    if (flockDetails.ageUnit === 'days')   ageWeeks = v / 7;
    else if (flockDetails.ageUnit === 'weeks')  ageWeeks = v;
    else if (flockDetails.ageUnit === 'months') ageWeeks = v * 4.33;
  }

  const scored = DISEASE_DB.map(disease => {
    // Bird-type gating: suppress if disease is restricted to specific types and this bird doesn't qualify
    if (disease.birdTypes && resolvedBirdType !== 'poultry') {
      if (!disease.birdTypes.includes(resolvedBirdType)) return null;
    }
    // Age gating
    if (ageWeeks !== null) {
      if (disease.minAgeWeeks && ageWeeks < disease.minAgeWeeks) return null;
      if (disease.maxAgeWeeks && ageWeeks > disease.maxAgeWeeks) return null;
    }
    // Vaccination suppression: Newcastle is less likely if vaccinated for ND
    let { score, matched } = scoreDisease(disease, symptomTags, textLower);
    if (disease.name.includes('Newcastle') && vaccinations.includes('newcastle')) score *= 0.4;
    if (disease.name.includes('Gumboro') && vaccinations.includes('gumboro'))       score *= 0.4;
    if (disease.name.includes("Marek's") && vaccinations.includes('mareks'))        score *= 0.4;
    if (disease.name.includes('Bronchitis') && vaccinations.includes('ib'))         score *= 0.5;
    if (disease.name.includes('Fowl Typhoid') && vaccinations.includes('fowl_typhoid')) score *= 0.5;
    if (disease.name.includes('Fowl Pox') && vaccinations.includes('fowl_pox'))    score *= 0.4;
    return { disease, score, matched };
  }).filter(r => r && r.score > 0)
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
