const DEFAULT_CONVERSATION_STATE = {
  mode: 'idle',
  pendingDestination: null,
  pendingRecommendationQuery: null,
  lastRecommendationSet: [],
  lastIntent: null,
  wizardState: null,
  selectedItem: null,
  pendingAction: null,
  lastSurface: null,
};

function normalizeConversationState(state = {}) {
  return {
    ...DEFAULT_CONVERSATION_STATE,
    ...(state || {}),
    lastRecommendationSet: Array.isArray(state?.lastRecommendationSet) ? state.lastRecommendationSet : [],
  };
}

function decideNextState({ intent, surface, currentState = {}, statePatch = {} } = {}) {
  const state = normalizeConversationState(currentState);
  const next = {
    ...state,
    ...statePatch,
    lastIntent: intent || state.lastIntent,
    lastSurface: surface || state.lastSurface,
  };
  if (intent === 'GREETING' || intent === 'GENERAL_CHAT' || intent === 'TRAVEL_QUESTION') next.mode = 'idle';
  if (intent === 'DESTINATION_ONLY') next.mode = 'clarifying_destination';
  if (intent === 'PLAN_TRIP') next.mode = 'collecting_trip_context';
  if (intent === 'GET_RECOMMENDATION' || intent === 'REFINE_RECOMMENDATION') next.mode = 'showing_recommendations';
  if (intent === 'EDIT_ITINERARY') next.mode = 'editing_itinerary';
  if (intent === 'REPLAN_ITINERARY') next.mode = 'replanning_itinerary';
  if (intent === 'DOCUMENTATION') next.mode = 'answering_documentation';
  return next;
}

export { DEFAULT_CONVERSATION_STATE, normalizeConversationState, decideNextState };
