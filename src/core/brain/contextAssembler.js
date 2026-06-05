function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

function activeTripContext(activeTrip) {
  if (!activeTrip) {
    return {
      id: null,
      destination: '',
      dates: null,
      durationDays: null,
      travelers: null,
      interests: [],
      itineraryDays: [],
    };
  }
  const tripContext = activeTrip.tripContext || activeTrip.trip_context || activeTrip.context || {};
  const days = Array.isArray(activeTrip.days)
    ? activeTrip.days
    : Array.isArray(tripContext.days)
      ? tripContext.days
      : [];
  return {
    id: activeTrip.id || null,
    destination: activeTrip.destination || tripContext.destination || '',
    dates: activeTrip.dates || tripContext.dates || null,
    durationDays: activeTrip.durationDays || tripContext.durationDays || null,
    travelers: activeTrip.travelers || tripContext.travelers || null,
    travelerComposition: activeTrip.travelerComposition || tripContext.travelerComposition || tripContext.travelers?.composition || '',
    interests: asArray(activeTrip.interests || tripContext.interests || tripContext.priorities),
    itineraryDays: days,
    selectedItem: activeTrip.selectedItem || null,
  };
}

function profileContext(profile) {
  const travelerProfile = profile?.travelerProfile || {};
  const preferences = profile?.preferences || {};
  return {
    userProfile: {
      defaultComposition: travelerProfile.defaultComposition || '',
      commonCompanions: asArray(travelerProfile.commonCompanions),
      childrenAges: asArray(travelerProfile.childrenAges),
      pets: asArray(travelerProfile.commonCompanions).some(item => /pet/i.test(String(item))),
    },
    preferences: {
      interests: asArray(preferences.interests),
      pace: preferences.pace || '',
      budgetStyle: preferences.budgetStyle || '',
      priorityRanking: asArray(preferences.priorityRanking),
    },
  };
}

function buildGaidContext({
  profile = null,
  activeTrip = null,
  surface = 'home',
  lastIntent = '',
  pendingDestination = null,
  selectedItem = null,
  lastRecommendationSet = null,
  lastRecommendationQuery = '',
  pendingAction = null,
  mode = 'idle',
  wizardState = null,
  lastSurface = null,
} = {}) {
  const profilePart = profileContext(profile);
  return {
    ...profilePart,
    activeTrip: activeTripContext(activeTrip),
    conversation: {
      mode,
      surface,
      lastIntent,
      pendingDestination,
      pendingRecommendationQuery: lastRecommendationQuery,
      selectedItem,
      lastRecommendationSet,
      lastRecommendationQuery,
      wizardState,
      pendingAction,
      lastSurface,
    },
  };
}

export { buildGaidContext };
