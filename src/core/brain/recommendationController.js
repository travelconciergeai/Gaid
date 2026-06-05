function recommendationQueryFromEntities(entities = {}, message = '') {
  return {
    originalQuery: message,
    destination: entities.destination || '',
    type: entities.recommendationType || 'activity',
    refinement: entities.refinement || '',
  };
}

function buildRecommendationSurface({ cards = [], query = {}, missingDestination = false } = {}) {
  if (missingDestination) {
    return {
      cards: [],
      refinementQuestion: 'Em qual cidade você quer essa dica?',
      actions: [],
      query,
    };
  }
  return {
    cards,
    refinementQuestion: query.type === 'restaurant'
      ? 'Você prefere algo mais romântico, clássico ou moderno?'
      : query.type === 'cafe'
        ? 'Prefere café rápido, brunch ou uma pausa mais charmosa?'
        : 'Quer algo mais local, leve ou especial?',
    actions: [],
    query,
  };
}

export { recommendationQueryFromEntities, buildRecommendationSurface };
