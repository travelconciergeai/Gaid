import { classifyGaidIntent, normText } from './intentRouter.js';
import {
  checklist,
  recommendationCards,
  replanningPreview,
  shortMessage,
  wizardBlock,
} from './outputContract.js';

const PLAN_INTENT_RE = /\b(roteiro|viagem|viajar|planej|planejar|monte|montar|criar|crie|gerar|gere|itinerario|itinerário)\b/;
const RECOMMENDATION_RE = /\b(o que fazer|onde|indica|indique|recomenda|recomende|restaurante|jantar|cafe|café|hotel|bar\b|atividade|passeio|lugar|hoje|agora)\b/;
const REFINEMENT_RE = /\b(nao gostei|não gostei|outras|outra|mais barato|mais economico|mais econômico|mais romantico|mais romântico|menos turistico|menos turístico|melhor com crianca|melhor com criança|mais perto)\b/;
const EDIT_ITINERARY_RE = /\b(troca|substitui|move|mover|remove|remover|tira|adiciona|inclui|coloca).*(roteiro|dia|isso|esse|essa|item|restaurante|museu|atividade|passeio)|\b(troque|substitua|mova|remova)\b/;
const REPLAN_RE = /\b(vai chover|chuva|perdi a manha|perdi a manhã|atrasamos|estou cansado|to cansado|tô cansado|filho esta cansado|filho está cansado|muito calor|muito deslocamento|fila|fechou|greve)\b/;
const DOCUMENTATION_RE = /\b(visto|passaporte|documentos?|seguro|vacina|autorizacao|autorização|menor|dirigir|levar na mala|o que levar)\b/;
const TRAVEL_QUESTION_RE = /\b(melhor epoca|melhor época|vale a pena|quantos dias|qual bairro|ficar em|quando ir)\b/;

function filled(value) {
  return String(value || '').trim();
}

function titleCase(value) {
  return filled(value).replace(/\s+/g, ' ').replace(/\b\p{L}/gu, char => char.toUpperCase());
}

function isBarePlace(value) {
  const raw = filled(value);
  const text = normText(raw);
  if (!/^[a-z\s\u00C0-\u017F]{2,36}$/i.test(raw)) return false;
  return !PLAN_INTENT_RE.test(text) && !RECOMMENDATION_RE.test(text) && !DOCUMENTATION_RE.test(text);
}

function isGenericPlanPhrase(value) {
  const text = normText(value);
  return [
    /^gerar roteiro novo$/,
    /^gerar roteiro$/,
    /^quero montar um roteiro$/,
    /^quero criar um roteiro$/,
    /^criar viagem$/,
    /^planejar viagem$/,
    /^montar roteiro$/,
    /^novo roteiro$/,
  ].some(pattern => pattern.test(text));
}

function extractDestinationEvidence(message) {
  const raw = filled(message);
  if (!raw || isGenericPlanPhrase(raw)) return null;
  const withoutDate = raw
    .replace(/\b(?:em|no|na)?\s*(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b.*$/i, '')
    .replace(/\b(?:por|durante)\s+\d+\s*(?:dias|noites).*/i, '')
    .trim();
  const match = withoutDate.match(/\b(?:roteiro|viagem|viajar|ir|vou|vamos|quero|pretendo)?\s*(?:para|pra|em|no|na)\s+([\wÀ-ÿ' -]{2,80})/i);
  const candidate = titleCase((match?.[1] || '').replace(/[,.!?;:].*$/, '').trim());
  if (!candidate || isGenericPlanPhrase(candidate) || PLAN_INTENT_RE.test(normText(candidate))) return null;
  return {
    destination: candidate,
    source: 'user_explicit_message',
    originalText: raw,
    confidence: 0.86,
    confirmed: true,
  };
}

function extractPeriod(message) {
  const text = normText(message);
  const month = text.match(/\b(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/)?.[1];
  if (month) return month.replace(/^./, char => char.toUpperCase());
  const broad = text.match(/\b(fim de ano|ferias|férias|carnaval|verao|verão|inverno)\b/)?.[1];
  return broad ? broad.replace(/^./, char => char.toUpperCase()) : '';
}

function profileTripDefaults(context) {
  return {
    travelers: context.userProfile.defaultComposition
      ? {
        count: context.userProfile.defaultComposition === 'Casal' ? 2 : context.userProfile.defaultComposition === 'Sozinho' ? 1 : null,
        composition: context.userProfile.defaultComposition,
        children: { ages: context.userProfile.childrenAges || [] },
      }
      : null,
    travelerComposition: context.userProfile.defaultComposition || '',
    childrenAges: context.userProfile.childrenAges || [],
    interests: context.preferences.interests || [],
    stylePace: context.preferences.pace || '',
    budget: context.preferences.budgetStyle || '',
    priorityRanking: context.preferences.priorityRanking || [],
  };
}

function detectIntent(message, context) {
  const text = normText(message);
  if (REFINEMENT_RE.test(text) && context.conversation.lastRecommendationSet) {
    return { intent: 'REFINE_RECOMMENDATION', confidence: 0.82, reason: 'Refinamento de recomendações anteriores.' };
  }
  if (REPLAN_RE.test(text)) {
    return { intent: 'REPLAN_ITINERARY', confidence: 0.86, reason: 'Fator externo ou operacional afeta o roteiro.' };
  }
  if (EDIT_ITINERARY_RE.test(text)) {
    return { intent: 'EDIT_ITINERARY', confidence: 0.84, reason: 'Pedido de alteração no roteiro.' };
  }
  if (DOCUMENTATION_RE.test(text)) {
    return { intent: 'DOCUMENTATION', confidence: 0.82, reason: 'Pergunta sobre documentação, requisitos ou preparação.' };
  }
  if (RECOMMENDATION_RE.test(text) && !PLAN_INTENT_RE.test(text)) {
    const base = classifyGaidIntent(message);
    return { ...base, intent: base.intent === 'UNCLEAR' ? 'GET_RECOMMENDATION' : base.intent, confidence: Math.max(base.confidence || 0, 0.82) };
  }
  if (PLAN_INTENT_RE.test(text)) {
    return { intent: 'PLAN_TRIP', confidence: 0.86, reason: 'Pedido de criação de viagem ou roteiro.' };
  }
  if (TRAVEL_QUESTION_RE.test(text)) {
    return { intent: 'TRAVEL_QUESTION', confidence: 0.76, reason: 'Pergunta geral de decisão de viagem.' };
  }
  if (isBarePlace(message)) {
    return { intent: 'UNCLEAR', confidence: 0.6, reason: 'Destino isolado sem ação clara.' };
  }
  return { intent: 'GENERAL_CHAT', confidence: 0.45, reason: 'Mensagem fora dos fluxos estruturados principais.' };
}

function controllerForPendingDestination(message, context) {
  const pending = context.conversation.pendingDestination;
  if (!pending?.destination) return null;
  const text = normText(message);
  if (/\b(roteiro|viagem|planej|montar|criar)\b/.test(text)) {
    return {
      mode: 'collecting_trip_context',
      intent: 'PLAN_TRIP',
      surface: 'wizard',
      statePatch: { pendingDestination: null },
      action: {
        type: 'START_WIZARD',
        seedContext: {
          ...profileTripDefaults(context),
          destination: pending.destination,
          destinationEvidence: {
            destination: pending.destination,
            source: 'pending_destination_confirmation',
            originalText: `${pending.originalText || pending.destination} · ${message}`,
            confidence: 0.95,
            confirmed: true,
          },
        },
      },
      response: wizardBlock({ step: 'destination', question: 'Destino confirmado.', prefilledValue: pending.destination }),
    };
  }
  if (/\b(dica|recomend|indica|onde|jantar|cafe|café|restaurante|o que fazer)\b/.test(text)) {
    return {
      mode: 'recommendation',
      intent: 'GET_RECOMMENDATION',
      surface: 'cards',
      statePatch: { pendingDestination: null },
      action: { type: 'SHOW_RECOMMENDATIONS', message: `${message} ${pending.destination}`, destination: pending.destination },
      response: recommendationCards({ cards: [], refinementQuestion: `Quer algo mais local, romântico ou prático em ${pending.destination}?` }),
    };
  }
  return null;
}

function documentationChecklist(message, context) {
  const destination = context.activeTrip.destination || extractDestinationEvidence(message)?.destination || 'o destino';
  return checklist({
    title: 'Checklist de documentação',
    context: { destination },
    items: [
      { label: `Confirmar exigências oficiais para ${destination}`, status: 'todo' },
      { label: 'Verificar validade do passaporte e documentos pessoais', status: 'todo' },
      { label: 'Checar seguro viagem, vacinas e autorização para menores se aplicável', status: 'todo' },
    ],
  });
}

function conversationController(message, context = {}) {
  const pendingDecision = controllerForPendingDestination(message, context);
  if (pendingDecision) return pendingDecision;

  const detected = detectIntent(message, context);
  const destinationEvidence = extractDestinationEvidence(message);
  const period = extractPeriod(message);

  if (detected.intent === 'PLAN_TRIP') {
    return {
      mode: 'collecting_trip_context',
      intent: 'PLAN_TRIP',
      surface: 'wizard',
      statePatch: {},
      action: {
        type: 'START_WIZARD',
        seedContext: {
          ...profileTripDefaults(context),
          ...(destinationEvidence ? { destination: destinationEvidence.destination, destinationEvidence } : {}),
          ...(period ? { period, dates: { label: period } } : {}),
        },
      },
      response: wizardBlock({
        step: destinationEvidence ? 'period_or_dates' : 'destination',
        question: destinationEvidence ? 'Quando você imagina viajar?' : 'Para onde você quer viajar?',
        prefilledValue: destinationEvidence?.destination || '',
      }),
    };
  }

  if (detected.intent === 'REFINE_RECOMMENDATION') {
    return {
      mode: 'recommendation',
      intent: 'REFINE_RECOMMENDATION',
      surface: 'cards',
      statePatch: { lastIntent: detected.intent },
      action: { type: 'REFINE_RECOMMENDATIONS' },
      response: recommendationCards({ cards: [], refinementQuestion: 'Quer que eu puxe para mais local, econômico ou especial?' }),
    };
  }

  if (['GET_RECOMMENDATION', 'FIND_RESTAURANT', 'FIND_CAFE', 'FIND_ATTRACTION', 'FIND_HOTEL'].includes(detected.intent)) {
    return {
      mode: 'recommendation',
      intent: detected.intent,
      surface: 'cards',
      statePatch: { lastIntent: detected.intent, lastRecommendationQuery: message },
      action: { type: 'SHOW_RECOMMENDATIONS', message },
      response: recommendationCards({ cards: [], refinementQuestion: 'Quer algo mais local, especial ou prático?' }),
    };
  }

  if (detected.intent === 'REPLAN_ITINERARY') {
    return {
      mode: 'itinerary_generation',
      intent: detected.intent,
      surface: 'replanning_preview',
      statePatch: { lastIntent: detected.intent },
      action: { type: 'ROUTE_TO_PLAN_REPLANNING' },
      response: replanningPreview({
        problemDetected: 'O roteiro pode precisar de ajuste.',
        proposedChanges: [],
        impact: 'Vou preservar o que já existe e propor uma mudança antes de aplicar.',
      }),
    };
  }

  if (detected.intent === 'EDIT_ITINERARY') {
    return {
      mode: 'itinerary_generation',
      intent: detected.intent,
      surface: 'short_message',
      statePatch: { lastIntent: detected.intent },
      action: { type: 'ROUTE_TO_PLAN_EDITING' },
      response: shortMessage({ body: 'Abra o roteiro e selecione o item que você quer ajustar. Eu aplico a mudança direto na timeline.' }),
    };
  }

  if (detected.intent === 'DOCUMENTATION') {
    return {
      mode: 'clarification',
      intent: detected.intent,
      surface: 'checklist',
      statePatch: { lastIntent: detected.intent },
      action: { type: 'SHOW_CHECKLIST' },
      response: documentationChecklist(message, context),
    };
  }

  if (detected.intent === 'TRAVEL_QUESTION') {
    return {
      mode: 'clarification',
      intent: detected.intent,
      surface: 'short_message',
      statePatch: { lastIntent: detected.intent },
      action: { type: 'SHOW_SHORT_MESSAGE' },
      response: shortMessage({ body: 'Consigo te ajudar com essa decisão. Me diga o destino e o tipo de viagem para eu responder com mais precisão.' }),
    };
  }

  if (detected.intent === 'UNCLEAR' && isBarePlace(message)) {
    const destination = titleCase(message);
    return {
      mode: 'clarification',
      intent: 'UNCLEAR',
      surface: 'short_message',
      statePatch: {
        lastIntent: 'UNCLEAR',
        pendingDestination: {
          destination,
          source: 'user_explicit_message',
          originalText: message,
          confidence: 0.75,
          confirmed: false,
        },
      },
      action: { type: 'ASK_DESTINATION_CLARIFICATION' },
      response: shortMessage({ body: `Você quer montar uma viagem para ${destination} ou quer uma dica rápida por lá?` }),
    };
  }

  return {
    mode: 'clarification',
    intent: 'GENERAL_CHAT',
    surface: 'short_message',
    statePatch: { lastIntent: 'GENERAL_CHAT' },
    action: { type: 'SHOW_SHORT_MESSAGE' },
    response: shortMessage({ body: 'Posso te ajudar criando um roteiro, trazendo dicas em cards ou ajustando uma viagem existente. O que você quer fazer agora?' }),
  };
}

export { conversationController, detectIntent, extractDestinationEvidence };
