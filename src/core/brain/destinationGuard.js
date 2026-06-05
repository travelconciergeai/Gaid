import { normalizeSpaces, stripAccents } from './normalizer.js';

const BLOCKED_DESTINATION_TERMS = new Set([
  'ola',
  'oi',
  'bom dia',
  'boa tarde',
  'boa noite',
  'tudo bem',
  'hello',
  'hey',
  'roteiro',
  'viagem',
  'dica',
  'gerar',
  'criar',
  'montar',
  'planejar',
  'novo roteiro',
  'roteiro novo',
  'gerar roteiro novo',
  'quero montar um roteiro',
  'quero criar uma viagem',
  'ajuda',
  'teste',
  'sim',
  'nao',
  'não',
  'ok',
  'beleza',
  'comecar',
  'começar',
  'restaurante',
  'hotel',
  'cafe',
  'café',
  'barato',
  'romantico',
  'romântico',
]);

const FORBIDDEN_SOURCES = new Set([
  'raw_prompt',
  'gpt_inference',
  'fallback',
  'generated_text',
  'assistant_suggestion',
]);

const ALLOWED_SOURCES = new Set([
  'explicit_pattern',
  'destination_only_confirmation',
  'wizard_answer',
  'user_selected_option',
  'pending_destination_confirmation',
]);

function titleCaseDestination(value) {
  return normalizeSpaces(value)
    .split(' ')
    .map(part => part ? `${part.charAt(0).toLocaleUpperCase('pt-BR')}${part.slice(1).toLocaleLowerCase('pt-BR')}` : '')
    .join(' ');
}

function destinationKey(value) {
  return stripAccents(normalizeSpaces(value).toLowerCase());
}

function isBlockedDestination(value) {
  const key = destinationKey(value);
  if (!key || key.length < 2) return true;
  if (BLOCKED_DESTINATION_TERMS.has(key)) return true;
  if (/^(quero|montar|criar|gerar|planejar|roteiro|viagem|dica)(\b|$)/.test(key)) return true;
  if (/^(sim|nao|ok|beleza|ajuda|teste|comecar)$/.test(key)) return true;
  return false;
}

function validateDestinationCandidate(candidate, evidence = {}) {
  const destination = titleCaseDestination(candidate || evidence.destination || '');
  const source = evidence.source || '';
  const confidence = Number.isFinite(evidence.confidence) ? evidence.confidence : 0;
  if (!destination) {
    return { valid: false, destination: '', confidence: 0, reason: 'empty_candidate', evidence };
  }
  if (isBlockedDestination(destination)) {
    console.info('destination_candidate_rejected', { destination, reason: 'blocked_term', evidence });
    return { valid: false, destination, confidence, reason: 'blocked_term', evidence };
  }
  if (FORBIDDEN_SOURCES.has(source)) {
    console.info('destination_candidate_rejected', { destination, reason: 'forbidden_source', evidence });
    return { valid: false, destination, confidence, reason: 'forbidden_source', evidence };
  }
  if (source && !ALLOWED_SOURCES.has(source)) {
    console.info('destination_candidate_rejected', { destination, reason: 'unknown_source', evidence });
    return { valid: false, destination, confidence, reason: 'unknown_source', evidence };
  }
  if (confidence < 0.65) {
    console.info('destination_candidate_rejected', { destination, reason: 'low_confidence', evidence });
    return { valid: false, destination, confidence, reason: 'low_confidence', evidence };
  }
  return {
    valid: true,
    destination,
    confidence,
    reason: 'valid_destination',
    evidence: {
      ...evidence,
      destination,
      confidence,
    },
  };
}

function createDestinationEvidence({ destination, source, originalText, extractionPattern, confidence = 0.86, confirmed = true }) {
  const validation = validateDestinationCandidate(destination, {
    destination,
    source,
    originalText,
    extractionPattern,
    confidence,
    confirmed,
  });
  if (!validation.valid) return null;
  const evidence = validation.evidence;
  console.info('destination_evidence_created', evidence);
  return evidence;
}

export {
  BLOCKED_DESTINATION_TERMS,
  ALLOWED_SOURCES,
  FORBIDDEN_SOURCES,
  titleCaseDestination,
  isBlockedDestination,
  validateDestinationCandidate,
  createDestinationEvidence,
};
