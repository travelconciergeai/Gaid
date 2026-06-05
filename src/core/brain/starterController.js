function buildDynamicStarters(gaidContext = {}) {
  const profile = gaidContext.userProfile || {};
  const preferences = gaidContext.preferences || {};
  const starters = [];
  const family = /fam/i.test(profile.defaultComposition || '') || (profile.childrenAges || []).length > 0;
  const couple = /casal/i.test(profile.defaultComposition || '');
  const foodie = (preferences.interests || []).some(item => /gastr/i.test(item));

  if (family) {
    starters.push({ label: 'Ideias para crianças', prompt: 'O que fazer com crianças?', expectedIntent: 'GET_RECOMMENDATION', surface: 'recommendation_cards', enabled: true });
    starters.push({ label: 'Roteiro leve para família', prompt: 'Monte um roteiro leve para família', expectedIntent: 'PLAN_TRIP', surface: 'wizard', enabled: true });
  }
  if (couple) {
    starters.push({ label: 'Jantar romântico', prompt: 'Sugira um jantar romântico', expectedIntent: 'GET_RECOMMENDATION', surface: 'recommendation_cards', enabled: true });
  }
  if (foodie) {
    starters.push({ label: 'Roteiro gastronômico', prompt: 'Quero criar um roteiro gastronômico', expectedIntent: 'PLAN_TRIP', surface: 'wizard', enabled: true });
  }
  if (gaidContext.activeTrip?.id) {
    starters.push({ label: 'Deixar roteiro mais leve', prompt: 'Deixa o roteiro mais leve', expectedIntent: 'EDIT_ITINERARY', surface: 'short_message', enabled: true });
  }
  starters.push({ label: 'Criar roteiro', prompt: 'Quero montar um roteiro', expectedIntent: 'PLAN_TRIP', surface: 'wizard', enabled: true });
  starters.push({ label: 'Pedir uma dica', prompt: 'Me dá uma dica de viagem', expectedIntent: 'GET_RECOMMENDATION', surface: 'recommendation_cards', enabled: true });
  return starters.filter(starter => starter.enabled).slice(0, 4);
}

export { buildDynamicStarters };
