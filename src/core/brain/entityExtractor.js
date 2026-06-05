import { createDestinationEvidence } from './destinationGuard.js';
import { normalizeUserMessage, normalizeSpaces } from './normalizer.js';

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const DESTINATION_PATTERNS = [
  { name: 'roteiro_para', re: /\broteiro\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'viagem_para', re: /\bviagem\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'quero_ir_para', re: /\b(?:quero|queria|gostaria|pretendo)\s+(?:ir|viajar)\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'vou_viajar_para', re: /\b(?:vou|vamos)\s+viajar\s+(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'planejar_para', re: /\bplanej\w*\s+(?:viagem|roteiro)?\s*(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'ferias_em', re: /\bf[ée]rias\s+(?:em|no|na|para|pra)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'lua_de_mel_em', re: /\blua de mel\s+(?:em|no|na|para|pra)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'dicas_em', re: /\bdicas?\s+(?:em|no|na|para|pra)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'onde_jantar_em', re: /\bonde\s+jantar\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'o_que_fazer_em', re: /\bo que fazer\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'cafe_em', re: /\bcaf[ée]\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'restaurante_em', re: /\brestaurantes?\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
  { name: 'hotel_em', re: /\b(?:hotel|hot[eé]is|hospedagem|pousada)\s+(?:em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i },
];

function cleanupDestinationCandidate(value) {
  return normalizeSpaces(value)
    .replace(/\b(?:em|no|na)?\s*(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b.*$/i, '')
    .replace(/\b(?:por|durante)\s+\d+\s*(?:dias|noites).*/i, '')
    .replace(/[,.!?;:].*$/, '')
    .trim();
}

function extractDestination(normalizedMessage) {
  const raw = normalizedMessage.originalText;
  for (const pattern of DESTINATION_PATTERNS) {
    const match = raw.match(pattern.re);
    const candidate = cleanupDestinationCandidate(match?.[1] || '');
    if (!candidate) continue;
    const evidence = createDestinationEvidence({
      destination: candidate,
      source: 'explicit_pattern',
      originalText: raw,
      extractionPattern: pattern.name,
      confidence: 0.88,
      confirmed: true,
    });
    if (evidence) return { destination: evidence.destination, destinationEvidence: evidence };
  }
  return { destination: '', destinationEvidence: null };
}

function extractPeriod(normalizedMessage) {
  const text = normalizedMessage.normalizedNoAccent;
  const month = MONTHS.find(month => text.includes(month.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  if (month) return month.replace(/^./, char => char.toUpperCase());
  const broad = text.match(/\b(fim de ano|ferias|carnaval|verao|inverno|proximo mes|próximo mês)\b/)?.[1];
  return broad ? broad.replace(/^./, char => char.toUpperCase()) : '';
}

function extractDuration(normalizedMessage) {
  const text = normalizedMessage.normalizedNoAccent;
  if (/\bfim de semana\b/.test(text)) return { durationDays: 3 };
  if (/\buma semana\b|\b1 semana\b/.test(text)) return { durationDays: 7 };
  const days = Number(text.match(/\b(\d+)\s*dias?\b/)?.[1]);
  if (Number.isFinite(days) && days > 0) return { durationDays: days };
  const nights = Number(text.match(/\b(\d+)\s*noites?\b/)?.[1]);
  if (Number.isFinite(nights) && nights > 0) return { durationDays: nights + 1 };
  return { durationDays: null };
}

function extractRecommendationType(normalizedMessage) {
  const text = normalizedMessage.normalizedNoAccent;
  if (/\b(restaurante|jantar|almoco|comer)\b/.test(text)) return 'restaurant';
  if (/\b(cafe|cafeteria|brunch)\b/.test(text)) return 'cafe';
  if (/\b(hotel|hoteis|hospedagem|pousada)\b/.test(text)) return 'hotel';
  if (/\b(museu|atracao|passeio|atividade|o que fazer)\b/.test(text)) return 'attraction';
  return 'activity';
}

function extractDocumentationTopic(normalizedMessage) {
  const text = normalizedMessage.normalizedNoAccent;
  if (/\bvisto\b/.test(text)) return 'visto';
  if (/\bpassaporte\b/.test(text)) return 'passaporte';
  if (/\bseguro\b/.test(text)) return 'seguro viagem';
  if (/\bvacina\b/.test(text)) return 'vacina';
  if (/\bmenor|crianca|autorizacao\b/.test(text)) return 'documentos para menor';
  if (/\bpet\b/.test(text)) return 'documentação para pet';
  if (/\bo que levar|mala\b/.test(text)) return 'o que levar';
  return 'documentos de viagem';
}

function extractExternalFactor(normalizedMessage) {
  const text = normalizedMessage.normalizedNoAccent;
  if (/\bchuva|temporal|chover\b/.test(text)) return 'rain';
  if (/\bcalor|quente\b/.test(text)) return 'heat';
  if (/\bfrio\b/.test(text)) return 'cold';
  if (/\bperdi a manha|atrasamos|atrasado\b/.test(text)) return 'delay';
  if (/\bcansad|filho cans|crianca cans\b/.test(text)) return 'tired';
  if (/\bfechou|fechado\b/.test(text)) return 'closed_place';
  if (/\bgreve|transito|trânsito|fila\b/.test(text)) return 'logistics';
  return '';
}

function extractItineraryEditAction(normalizedMessage) {
  const text = normalizedMessage.normalizedNoAccent;
  if (/\btroca|substitui|alternativa|nao gostei\b/.test(text)) return 'replace';
  if (/\bmove|mover|passa|joga|coloca.*dia|amanha\b/.test(text)) return 'move';
  if (/\bremove|remover|tira|apaga|exclui|deleta\b/.test(text)) return 'remove';
  if (/\badiciona|inclui|coloca\b/.test(text)) return 'add';
  return '';
}

function extractTravelerComposition(normalizedMessage) {
  const text = normalizedMessage.normalizedNoAccent;
  if (/\bsozinh|so eu|solo\b/.test(text)) return { travelers: { count: 1, composition: 'Solo' }, travelerComposition: 'Solo' };
  if (/\bcasal|esposa|marido|a dois\b/.test(text)) return { travelers: { count: 2, composition: 'Casal' }, travelerComposition: 'Casal' };
  const adults = Number(text.match(/(\d+)\s*adult/)?.[1]) || null;
  const children = Number(text.match(/(\d+)\s*(crianca|filh)/)?.[1]) || null;
  const ages = [...text.matchAll(/\b(\d{1,2})\s*anos?\b/g)].map(match => Number(match[1])).filter(age => age <= 17);
  if (adults || children || ages.length || /\bfamil/.test(text)) {
    return {
      travelers: {
        count: adults || children ? (adults || 0) + (children || ages.length || 0) : null,
        composition: 'Família',
        children: { count: children || ages.length || null, ages },
      },
      travelerComposition: 'Família',
      childrenAges: ages,
    };
  }
  return { travelers: null, travelerComposition: '', childrenAges: [] };
}

function extractEntities(messageOrNormalized, intent = 'GENERAL_CHAT') {
  const normalizedMessage = typeof messageOrNormalized === 'string'
    ? normalizeUserMessage(messageOrNormalized)
    : messageOrNormalized;
  const destination = extractDestination(normalizedMessage);
  const traveler = extractTravelerComposition(normalizedMessage);
  return {
    ...destination,
    period: extractPeriod(normalizedMessage),
    dates: null,
    ...extractDuration(normalizedMessage),
    ...traveler,
    recommendationType: ['GET_RECOMMENDATION', 'REFINE_RECOMMENDATION'].includes(intent) ? extractRecommendationType(normalizedMessage) : extractRecommendationType(normalizedMessage),
    refinement: intent === 'REFINE_RECOMMENDATION' ? normalizedMessage.originalText : '',
    documentationTopic: extractDocumentationTopic(normalizedMessage),
    externalFactor: extractExternalFactor(normalizedMessage),
    itineraryEditAction: extractItineraryEditAction(normalizedMessage),
  };
}

export { extractEntities };
