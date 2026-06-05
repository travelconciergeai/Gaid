import { decideNextState } from './conversationStateMachine.js';
import { validateDestinationCandidate } from './destinationGuard.js';
import { extractEntities } from './entityExtractor.js';
import { classifyIntent } from './intentClassifier.js';
import { normalizeUserMessage } from './normalizer.js';
import { buildRecommendationSurface, recommendationQueryFromEntities } from './recommendationController.js';
import {
  checklist,
  recommendationCards,
  replanningPreview,
  shortMessage,
  wizardBlock,
} from './outputContract.js';
import { buildWizardSeed, firstWizardStep } from './wizardController.js';

function recommendationIntentFromType(type) {
  if (type === 'restaurant') return 'FIND_RESTAURANT';
  if (type === 'cafe') return 'FIND_CAFE';
  if (type === 'hotel') return 'FIND_HOTEL';
  if (type === 'attraction') return 'FIND_ATTRACTION';
  return 'GET_RECOMMENDATION';
}

function destinationOnlyState(entities, normalized) {
  const validation = validateDestinationCandidate(normalized.originalText, {
    destination: normalized.originalText,
    source: 'destination_only_confirmation',
    originalText: normalized.originalText,
    extractionPattern: 'destination_only',
    confidence: 0.72,
    confirmed: false,
  });
  if (!validation.valid) return null;
  return {
    destination: validation.destination,
    source: 'destination_only',
    originalText: normalized.originalText,
    confidence: validation.confidence,
    confirmed: false,
  };
}

function documentationResponse(entities, gaidContext) {
  const destination = entities.destination || gaidContext.activeTrip?.destination || 'o destino';
  const children = (gaidContext.userProfile?.childrenAges || []).length > 0;
  const pets = gaidContext.userProfile?.pets;
  const items = [
    { label: `Confirmar exigências oficiais para ${destination}`, status: 'todo' },
    { label: 'Verificar validade de passaporte e documento pessoal', status: 'todo' },
    { label: 'Checar seguro viagem e vacinas quando aplicável', status: 'todo' },
  ];
  if (children) items.push({ label: 'Confirmar autorização e documentos para crianças ou menores', status: 'todo' });
  if (pets) items.push({ label: 'Validar documentação e regras para viajar com pet', status: 'todo' });
  return checklist({
    title: 'Checklist de documentação',
    items,
    context: { destination, topic: entities.documentationTopic },
  });
}

function short(body, title = '') {
  return shortMessage({ title, body });
}

function decision({ mode, intent, surface, statePatch = {}, action = {}, response, currentState }) {
  return {
    mode,
    intent,
    surface,
    statePatch,
    nextState: decideNextState({ intent, surface, currentState, statePatch }),
    action,
    response,
  };
}

function decisionForPendingDestination(normalized, gaidContext) {
  const pending = gaidContext.conversation?.pendingDestination;
  if (!pending?.destination) return null;
  const text = normalized.normalizedNoAccent;
  if (/\b(cancelar|desistir|nao|não)\b/.test(text)) {
    return decision({
      mode: 'idle',
      intent: 'GENERAL_CHAT',
      surface: 'short_message',
      statePatch: { pendingDestination: null },
      action: { type: 'SHOW_SHORT_MESSAGE' },
      response: short('Tudo bem. Quando quiser, posso montar um roteiro ou trazer uma dica rápida.'),
      currentState: gaidContext.conversation,
    });
  }
  if (/\b(roteiro|viagem|planej|montar|criar|sim)\b/.test(text)) {
    const seed = {
      destination: pending.destination,
      destinationEvidence: {
        destination: pending.destination,
        source: 'destination_only_confirmation',
        originalText: `${pending.originalText || pending.destination} · ${normalized.originalText}`,
        extractionPattern: 'pending_destination_confirmation',
        confidence: 0.95,
        confirmed: true,
      },
    };
    return decision({
      mode: 'collecting_trip_context',
      intent: 'PLAN_TRIP',
      surface: 'wizard',
      statePatch: { pendingDestination: null },
      action: { type: 'START_WIZARD', seedContext: buildWizardSeed({ entities: seed, gaidContext }) },
      response: wizardBlock({ step: 'period_or_dates', question: 'Quando você imagina viajar?', prefilledValue: pending.destination }),
      currentState: gaidContext.conversation,
    });
  }
  if (/\b(dica|recomend|indica|onde|jantar|cafe|café|restaurante|o que fazer)\b/.test(text)) {
    return decision({
      mode: 'showing_recommendations',
      intent: 'GET_RECOMMENDATION',
      surface: 'recommendation_cards',
      statePatch: { pendingDestination: null, pendingRecommendationQuery: normalized.originalText },
      action: { type: 'SHOW_RECOMMENDATIONS', message: `${normalized.originalText} ${pending.destination}`, destination: pending.destination },
      response: recommendationCards(buildRecommendationSurface({ query: { destination: pending.destination, type: 'activity' } })),
      currentState: gaidContext.conversation,
    });
  }
  return null;
}

function conversationController(message, gaidContext = {}) {
  const normalized = normalizeUserMessage(message);
  const pendingDecision = decisionForPendingDestination(normalized, gaidContext);
  if (pendingDecision) return pendingDecision;

  const classified = classifyIntent(normalized, gaidContext);
  const entities = extractEntities(normalized, classified.intent);
  const currentState = gaidContext.conversation || {};

  if (classified.intent === 'GREETING') {
    return decision({
      mode: 'idle',
      intent: 'GREETING',
      surface: 'short_message',
      action: { type: 'SHOW_SHORT_MESSAGE' },
      response: short('Oi! Posso te ajudar a montar um roteiro, encontrar uma dica ou organizar uma viagem.'),
      currentState,
    });
  }

  if (classified.intent === 'PLAN_TRIP') {
    const seedContext = buildWizardSeed({ entities, gaidContext });
    const step = firstWizardStep(seedContext);
    return decision({
      mode: 'collecting_trip_context',
      intent: 'PLAN_TRIP',
      surface: 'wizard',
      statePatch: { wizardState: { step, seedContext } },
      action: { type: 'START_WIZARD', seedContext },
      response: wizardBlock({
        step,
        componentType: step === 'duration' ? 'single_select' : 'free_text',
        question: step === 'destination' ? 'Para onde você quer viajar?' : step === 'duration' ? 'Quantos dias você quer viajar?' : 'Quando você imagina viajar?',
        prefilledValue: entities.destination || '',
        state: { entities },
      }),
      currentState,
    });
  }

  if (classified.intent === 'DESTINATION_ONLY') {
    const pendingDestination = destinationOnlyState(entities, normalized);
    if (pendingDestination) {
      return decision({
        mode: 'clarifying_destination',
        intent: 'DESTINATION_ONLY',
        surface: 'short_message',
        statePatch: { pendingDestination },
        action: { type: 'ASK_DESTINATION_CLARIFICATION' },
        response: short(`Você quer montar uma viagem para ${pendingDestination.destination} ou quer uma dica rápida por lá?`),
        currentState,
      });
    }
  }

  if (classified.intent === 'GET_RECOMMENDATION') {
    const activeDestination = gaidContext.activeTrip?.destination || '';
    const destination = entities.destination || activeDestination;
    const query = recommendationQueryFromEntities({ ...entities, destination }, normalized.originalText);
    return decision({
      mode: 'showing_recommendations',
      intent: recommendationIntentFromType(query.type),
      surface: 'recommendation_cards',
      statePatch: { pendingRecommendationQuery: normalized.originalText },
      action: { type: 'SHOW_RECOMMENDATIONS', message: normalized.originalText, destination },
      response: recommendationCards(buildRecommendationSurface({ query, missingDestination: !destination })),
      currentState,
    });
  }

  if (classified.intent === 'REFINE_RECOMMENDATION') {
    const hasPrevious = (gaidContext.conversation?.lastRecommendationSet || []).length > 0;
    if (!hasPrevious) {
      return decision({
        mode: 'idle',
        intent: 'REFINE_RECOMMENDATION',
        surface: 'short_message',
        action: { type: 'SHOW_SHORT_MESSAGE' },
        response: short('Claro — você quer novas opções para qual destino ou tipo de lugar?'),
        currentState,
      });
    }
    return decision({
      mode: 'showing_recommendations',
      intent: 'REFINE_RECOMMENDATION',
      surface: 'recommendation_cards',
      statePatch: { pendingRecommendationQuery: normalized.originalText },
      action: { type: 'REFINE_RECOMMENDATIONS', message: normalized.originalText },
      response: recommendationCards(buildRecommendationSurface({ query: { refinement: entities.refinement } })),
      currentState,
    });
  }

  if (classified.intent === 'DOCUMENTATION') {
    return decision({
      mode: 'answering_documentation',
      intent: 'DOCUMENTATION',
      surface: 'checklist',
      action: { type: 'SHOW_CHECKLIST' },
      response: documentationResponse(entities, gaidContext),
      currentState,
    });
  }

  if (classified.intent === 'REPLAN_ITINERARY') {
    return decision({
      mode: 'replanning_itinerary',
      intent: 'REPLAN_ITINERARY',
      surface: 'replanning_preview',
      action: { type: 'ROUTE_TO_PLAN_REPLANNING', externalFactor: entities.externalFactor },
      response: replanningPreview({
        problemDetected: entities.externalFactor || 'mudança de contexto',
        proposedChanges: [],
        impact: 'Vou preservar o roteiro e propor alternativas antes de aplicar.',
        actions: [{ id: 'apply', label: 'Aplicar' }],
      }),
      currentState,
    });
  }

  if (classified.intent === 'EDIT_ITINERARY') {
    return decision({
      mode: 'editing_itinerary',
      intent: 'EDIT_ITINERARY',
      surface: 'short_message',
      action: { type: 'ROUTE_TO_PLAN_EDITING', editAction: entities.itineraryEditAction },
      response: short('Abra o roteiro e selecione o item que quer ajustar. Eu aplico a mudança direto na timeline.'),
      currentState,
    });
  }

  if (classified.intent === 'TRAVEL_QUESTION') {
    return decision({
      mode: 'idle',
      intent: 'TRAVEL_QUESTION',
      surface: 'short_message',
      action: { type: 'SHOW_SHORT_MESSAGE' },
      response: short('Consigo te ajudar com essa decisão. Me diga o destino e o tipo de viagem para eu responder com mais precisão.'),
      currentState,
    });
  }

  return decision({
    mode: 'idle',
    intent: 'GENERAL_CHAT',
    surface: 'short_message',
    action: { type: 'SHOW_SHORT_MESSAGE' },
    response: short('Posso te ajudar criando um roteiro, trazendo dicas em cards ou organizando uma viagem. O que você quer fazer agora?'),
    currentState,
  });
}

export { conversationController };
