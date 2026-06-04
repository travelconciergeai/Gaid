export function normText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Classifica intenção da mensagem na Home (Discovery vs Planner vs ambíguo).
 * @returns {{ intent: string, confidence: number, requiresTrip: boolean, nextTool: string, reason: string }}
 */
export function classifyGaidIntent(message) {
  try {
    const text = normText(message);
    const planRe = /\b(roteiro|viagem|viajar|planej|planejar|monte|montar|criar|crie|itinerario|itinerario)\b/;
    const travelIntentRe = /\b(?:quero|vou|vamos|pretendo|queria|gostaria)\s+(?:ir|viajar)\b/;
    const travelWithDestinationRe = /\b(?:para|pra|em|no|na)\s+[\wÀ-ÿ]{2,}/i;
    const restaurantRe = /\b(restaurante|jantar|almoco|almoço|comer|onde jantar)\b/;
    const cafeRe = /\b(cafe|café|cafeteria|brunch)\b/;
    const attractionRe = /\b(o que fazer|atracao|atração|passeio|atividade|museu|chuva|crianca|criança|levar uma criança|hoje|agora)\b/;
    const hotelRe = /\b(hotel|hoteis|hotéis|hospedagem|pousada)\b/;
    const recommendationRe = /\b(o que fazer|indica|indique|recomenda|recomende|restaurante|cafe|café|hotel|hoteis|hotéis|bar\b|bares|atividade|passeio|onde|lugar|lugares|hoje|agora|jantar|chuva|criança|crianca)\b/;
    const barePlaceRe = /^[a-z\s\u00C0-\u017F]{2,32}$/i;

    if (recommendationRe.test(text) && !/\b(roteiro|planej|planejar|monte|montar|criar|crie)\b/.test(text)) {
      const intent = restaurantRe.test(text) ? 'FIND_RESTAURANT'
        : cafeRe.test(text) ? 'FIND_CAFE'
          : hotelRe.test(text) ? 'FIND_HOTEL'
            : attractionRe.test(text) ? 'FIND_ATTRACTION'
              : 'GET_RECOMMENDATION';
      return { intent, confidence: 0.84, requiresTrip: false, nextTool: 'Discovery Engine', reason: 'Pedido de indicação rápida de lugar ou atividade.' };
    }
    if (planRe.test(text) || travelIntentRe.test(text)) {
      return { intent: 'PLAN_TRIP', confidence: 0.86, requiresTrip: false, nextTool: 'Trip Planner', reason: 'Pedido de roteiro, viagem completa ou planejamento.' };
    }
    if (barePlaceRe.test(String(message || '').trim())) {
      return { intent: 'UNCLEAR', confidence: 0.58, requiresTrip: false, nextTool: 'Intent Router', reason: 'Destino isolado sem intenção clara.' };
    }
    return { intent: 'UNCLEAR', confidence: 0.5, requiresTrip: false, nextTool: 'Intent Router', reason: 'Mensagem sem intenção suficiente para criar viagem.' };
  } catch (_error) {
    return { intent: 'UNCLEAR', confidence: 0, requiresTrip: false, nextTool: 'Intent Router', reason: 'Falha local ao classificar intenção.' };
  }
}
