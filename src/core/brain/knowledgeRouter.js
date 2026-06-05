import {
  buildKnowledgeHints,
  getDestinationKnowledge,
  getReplanningRules,
  getTravelerRules,
} from './knowledgeCore.js';

export const KNOWLEDGE_SOURCES = {
  KNOWLEDGE_CORE: 'KNOWLEDGE_CORE',
  ATLAS: 'ATLAS',
  GOOGLE_MAPS: 'GOOGLE_MAPS',
  WEATHER: 'WEATHER',
  EXPERTS: 'EXPERTS',
};

const ACTIVE_INTENTS = new Set([
  'PLAN_TRIP',
  'GET_RECOMMENDATION',
  'FIND_RESTAURANT',
  'FIND_CAFE',
  'FIND_ATTRACTION',
  'FIND_HOTEL',
  'REPLAN_FOR_WEATHER',
  'OPTIMIZE_ITINERARY',
]);

function sourceMetadata(source, enabled, confidence = 0, reasoningHint = '') {
  return {
    source,
    enabled,
    confidence,
    reasoningHint,
  };
}

function sourceListForIntent(intent) {
  if (!ACTIVE_INTENTS.has(intent)) return [];
  return [
    sourceMetadata(
      KNOWLEDGE_SOURCES.KNOWLEDGE_CORE,
      true,
      0.8,
      'Knowledge Core v1 is active for curated destination, traveler, recommendation and replanning rules.'
    ),
    sourceMetadata(
      KNOWLEDGE_SOURCES.ATLAS,
      false,
      0,
      'Atlas integration is reserved for future curated expert/domain knowledge.'
    ),
    sourceMetadata(
      KNOWLEDGE_SOURCES.GOOGLE_MAPS,
      false,
      0,
      'Google Maps/Places integration is reserved for live places, ratings, hours and location data.'
    ),
    sourceMetadata(
      KNOWLEDGE_SOURCES.WEATHER,
      false,
      0,
      'Weather integration is reserved for live forecast-aware replanning.'
    ),
    sourceMetadata(
      KNOWLEDGE_SOURCES.EXPERTS,
      false,
      0,
      'Experts integration is reserved for human/expert validation and marketplace knowledge.'
    ),
  ];
}

export function resolveKnowledgeSources(intent) {
  return sourceListForIntent(intent);
}

export function buildKnowledgeContext(intent, context = {}) {
  const activeSources = resolveKnowledgeSources(intent);
  const knowledgeCoreEnabled = activeSources.some(source =>
    source.source === KNOWLEDGE_SOURCES.KNOWLEDGE_CORE && source.enabled
  );

  if (!knowledgeCoreEnabled) {
    return {
      destinationKnowledge: null,
      travelerRules: null,
      replanningRules: null,
      knowledgeHints: null,
      activeSources: [],
      sourceMetadata: activeSources,
    };
  }

  const destinationKnowledge = getDestinationKnowledge(context.destination);
  const travelerRules = getTravelerRules(
    context.travelerComposition ||
    context.profile ||
    context.travelers?.composition ||
    ''
  );
  const replanningRules = getReplanningRules(context);
  const knowledgeHints = buildKnowledgeHints(context);

  const sourceMetadata = activeSources.map(source => {
    if (source.source !== KNOWLEDGE_SOURCES.KNOWLEDGE_CORE) return source;
    return sourceMetadataForKnowledgeCore([
      destinationKnowledge,
      travelerRules,
      replanningRules,
      knowledgeHints,
    ]);
  });

  return {
    destinationKnowledge,
    travelerRules,
    replanningRules,
    knowledgeHints,
    activeSources: sourceMetadata.filter(source => source.enabled).map(source => source.source),
    sourceMetadata,
  };
}

export function getKnowledgeForRequest(intent, context = {}) {
  return {
    intent,
    context: buildKnowledgeContext(intent, context),
  };
}

function sourceMetadataForKnowledgeCore(results) {
  const confidence = Math.max(
    0,
    ...results
      .map(result => Number(result?.confidence))
      .filter(value => Number.isFinite(value))
  );
  const reasoningHint = results
    .map(result => result?.reasoningHint)
    .filter(Boolean)
    .join(' ');

  return sourceMetadata(
    KNOWLEDGE_SOURCES.KNOWLEDGE_CORE,
    true,
    confidence,
    reasoningHint || 'Knowledge Core consulted with neutral context.'
  );
}
