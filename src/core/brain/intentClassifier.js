import { isBlockedDestination } from './destinationGuard.js';

const GREETING_RE = /^(ola|olá|oi|bom dia|boa tarde|boa noite|tudo bem|e ai|e aí|hello|hey)[!.?\s]*$/i;
const DOCUMENTATION_RE = /\b(visto|passaporte|documentos?|seguro|vacina|autorizacao|autorização|menor|dirigir|mala|o que levar|pet)\b/;
const REPLAN_RE = /\b(vai chover|chuva|temporal|calor|muito quente|frio|perdi a manha|perdi a manhã|atrasamos|cansad|lugar fechou|fechado|greve|transito|trânsito|muito deslocamento|fila)\b/;
const EDIT_RE = /\b(troca|troque|substitui|substitua|move|mover|mova|remove|remover|remova|tira|apaga|exclui|adiciona|inclui|coloca).*(restaurante|museu|atividade|passeio|item|roteiro|dia|isso|esse|essa)|\b(deixa.*mais leve|menos correria|mais gastronomia|algo romantico|algo romântico)\b/;
const REFINE_RE = /\b(nao gostei|não gostei|traga outras|outras opcoes|outras opções|algo mais barato|mais romantico|mais romântico|menos turistico|menos turístico|mais perto|melhor para crianca|melhor para criança|mais sofisticado|algo local|outra vibe)\b/;
const RECOMMENDATION_RE = /\b(onde jantar|o que fazer|me indica|me indique|recomendacao|recomendação|restaurante|cafe|café|hotel|bar\b|lugar legal|dicas? em|onde tomar cafe|onde tomar café|algo romantico|algo romântico)\b/;
const PLAN_RE = /\b(roteiro|viagem|viajar|planej|planejar|monte|montar|criar|crie|gerar|gere|quero ir|vou viajar|ferias|férias|lua de mel)\b/;
const TRAVEL_QUESTION_RE = /\b(melhor epoca|melhor época|vale a pena|quantos dias|bairro|ficar em|quando ir)\b/;

function classifyIntent(normalizedMessage, gaidContext = {}) {
  const text = normalizedMessage.normalizedNoAccent;
  const original = normalizedMessage.originalText;

  if (GREETING_RE.test(original) || GREETING_RE.test(text)) {
    return { intent: 'GREETING', confidence: 0.98, reason: 'Saudação simples.' };
  }
  if (DOCUMENTATION_RE.test(text)) {
    return { intent: 'DOCUMENTATION', confidence: 0.88, reason: 'Pedido de documentos ou preparação.' };
  }
  if (REPLAN_RE.test(text)) {
    return { intent: 'REPLAN_ITINERARY', confidence: 0.88, reason: 'Fator externo ou operacional afeta o roteiro.' };
  }
  if (EDIT_RE.test(text)) {
    return { intent: 'EDIT_ITINERARY', confidence: 0.84, reason: 'Pedido de alteração no roteiro.' };
  }
  if (REFINE_RE.test(text)) {
    return {
      intent: 'REFINE_RECOMMENDATION',
      confidence: gaidContext.conversation?.lastRecommendationSet?.length ? 0.86 : 0.72,
      reason: 'Refinamento de recomendações.',
    };
  }
  if (RECOMMENDATION_RE.test(text) && !/\b(roteiro|planej|montar|criar|gerar)\b/.test(text)) {
    return { intent: 'GET_RECOMMENDATION', confidence: 0.86, reason: 'Pedido de dica ou recomendação.' };
  }
  if (PLAN_RE.test(text)) {
    return { intent: 'PLAN_TRIP', confidence: 0.86, reason: 'Pedido de roteiro ou viagem.' };
  }
  if (/^[a-z\s\u00C0-\u017F]{2,36}$/i.test(original) && !isBlockedDestination(original)) {
    return { intent: 'DESTINATION_ONLY', confidence: 0.72, reason: 'Destino isolado plausível.' };
  }
  if (TRAVEL_QUESTION_RE.test(text)) {
    return { intent: 'TRAVEL_QUESTION', confidence: 0.74, reason: 'Pergunta geral sobre decisão de viagem.' };
  }
  return { intent: 'GENERAL_CHAT', confidence: 0.48, reason: 'Sem intenção acionável no MVP.' };
}

export { classifyIntent };
