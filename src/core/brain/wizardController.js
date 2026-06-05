function wizardDefaultsFromContext(gaidContext = {}) {
  const profile = gaidContext.userProfile || {};
  const preferences = gaidContext.preferences || {};
  const defaultComposition = profile.defaultComposition || '';
  return {
    travelers: defaultComposition
      ? {
        count: defaultComposition === 'Casal' ? 2 : defaultComposition === 'Sozinho' ? 1 : null,
        composition: defaultComposition,
        children: { ages: profile.childrenAges || [] },
      }
      : null,
    travelerComposition: defaultComposition,
    childrenAges: profile.childrenAges || [],
    interests: preferences.interests || [],
    stylePace: preferences.pace || '',
    budget: preferences.budgetStyle || '',
    priorityRanking: preferences.priorityRanking || [],
  };
}

function buildWizardSeed({ entities = {}, gaidContext = {} } = {}) {
  return {
    ...wizardDefaultsFromContext(gaidContext),
    ...(entities.destination ? { destination: entities.destination, destinationEvidence: entities.destinationEvidence } : {}),
    ...(entities.period ? { period: entities.period, dates: { label: entities.period } } : {}),
    ...(entities.durationDays ? { durationDays: entities.durationDays, nights: Math.max(entities.durationDays - 1, 0) } : {}),
    ...(entities.travelers ? { travelers: entities.travelers, travelerComposition: entities.travelerComposition } : {}),
  };
}

function firstWizardStep(seed = {}) {
  if (!seed.destination) return 'destination';
  if (!seed.period && !seed.dates?.label) return 'period_or_dates';
  if (!seed.durationDays && !seed.nights) return 'duration';
  if (!seed.travelers && !seed.travelerComposition) return 'travelers';
  if (!seed.interests?.length) return 'interests';
  if (!seed.priorityRanking?.length) return 'priorities';
  return 'review';
}

export { wizardDefaultsFromContext, buildWizardSeed, firstWizardStep };
