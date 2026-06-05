import { buildGaidContext } from './contextAssembler.js';
import { conversationController } from './conversationController.js';

function baseContext(overrides = {}) {
  return buildGaidContext({
    profile: overrides.profile || null,
    activeTrip: overrides.activeTrip || null,
    pendingDestination: overrides.pendingDestination || null,
    lastRecommendationSet: overrides.lastRecommendationSet || null,
  });
}

const familyProfile = {
  travelerProfile: {
    defaultComposition: 'Família',
    commonCompanions: ['Crianças'],
    childrenAges: ['3–5'],
  },
  preferences: {
    interests: ['Cultura', 'Parques'],
    pace: 'Leve',
    budgetStyle: 'Confortável',
    priorityRanking: ['Atividades para crianças', 'Pouco deslocamento'],
  },
};

const TESTS = [
  { input: 'Olá', expected: { intent: 'GREETING', surface: 'short_message', noDestination: true } },
  { input: 'bom dia', expected: { intent: 'GREETING', surface: 'short_message' } },
  { input: 'Paris', expected: { intent: 'DESTINATION_ONLY', surface: 'short_message', pendingDestination: 'Paris' } },
  { input: 'roteiro para Holanda', expected: { intent: 'PLAN_TRIP', surface: 'wizard', destination: 'Holanda' } },
  { input: 'viagem para Turquia em agosto', expected: { intent: 'PLAN_TRIP', surface: 'wizard', destination: 'Turquia', period: 'Agosto' } },
  { input: 'gerar roteiro novo', expected: { intent: 'PLAN_TRIP', surface: 'wizard', noDestination: true } },
  { input: 'roteiro', expected: { intent: 'PLAN_TRIP', surface: 'wizard', noDestination: true } },
  { input: 'Onde jantar em Paris?', expected: { intent: 'FIND_RESTAURANT', surface: 'recommendation_cards', destination: 'Paris' } },
  { input: 'não gostei, traga outras', ctx: { lastRecommendationSet: [{ id: 'x' }] }, expected: { intent: 'REFINE_RECOMMENDATION', surface: 'recommendation_cards' } },
  { input: 'preciso de visto?', expected: { intent: 'DOCUMENTATION', surface: 'checklist' } },
  { input: 'ok', expected: { intent: 'GENERAL_CHAT', surface: 'short_message', noDestination: true } },
  { input: 'teste', expected: { intent: 'GENERAL_CHAT', surface: 'short_message', noDestination: true } },
  { input: 'quero ir para Japão', expected: { intent: 'PLAN_TRIP', surface: 'wizard', destination: 'Japão' } },
  { input: 'dicas em Bogotá', expected: { intent: 'GET_RECOMMENDATION', surface: 'recommendation_cards', destination: 'Bogotá' } },
  { input: 'criar viagem', expected: { intent: 'PLAN_TRIP', surface: 'wizard', noDestination: true } },
  { input: 'hotel em Paris', expected: { intent: 'FIND_HOTEL', surface: 'recommendation_cards', destination: 'Paris' } },
  { input: 'restaurante', expected: { intent: 'FIND_RESTAURANT', surface: 'recommendation_cards', noDestination: true } },
  { input: 'sim', expected: { intent: 'GENERAL_CHAT', surface: 'short_message', noDestination: true } },
  { input: 'não', expected: { intent: 'GENERAL_CHAT', surface: 'short_message', noDestination: true } },
  { input: 'começar', expected: { intent: 'GENERAL_CHAT', surface: 'short_message', noDestination: true } },
  { input: 'o que fazer em Paris?', ctx: { profile: familyProfile }, expected: { intent: 'FIND_ATTRACTION', surface: 'recommendation_cards', destination: 'Paris' } },
];

function destinationFromDecision(decision) {
  return decision.action?.seedContext?.destination ||
    decision.action?.destination ||
    decision.statePatch?.pendingDestination?.destination ||
    '';
}

function periodFromDecision(decision) {
  return decision.action?.seedContext?.period || decision.action?.seedContext?.dates?.label || '';
}

function checkResult(test, decision) {
  const expected = test.expected;
  const failures = [];
  if (expected.intent && decision.intent !== expected.intent) failures.push(`intent expected ${expected.intent}, got ${decision.intent}`);
  if (expected.surface && decision.surface !== expected.surface) failures.push(`surface expected ${expected.surface}, got ${decision.surface}`);
  const destination = destinationFromDecision(decision);
  if (expected.destination && destination !== expected.destination) failures.push(`destination expected ${expected.destination}, got ${destination || '(empty)'}`);
  if (expected.noDestination && destination) failures.push(`destination expected empty, got ${destination}`);
  if (expected.pendingDestination && decision.statePatch?.pendingDestination?.destination !== expected.pendingDestination) {
    failures.push(`pendingDestination expected ${expected.pendingDestination}, got ${decision.statePatch?.pendingDestination?.destination || '(empty)'}`);
  }
  const period = periodFromDecision(decision);
  if (expected.period && period !== expected.period) failures.push(`period expected ${expected.period}, got ${period || '(empty)'}`);
  return failures;
}

function runConversationControllerSelfTest() {
  const results = TESTS.map((test) => {
    const decision = conversationController(test.input, baseContext(test.ctx || {}));
    const failures = checkResult(test, decision);
    return {
      input: test.input,
      passed: failures.length === 0,
      failures,
      intent: decision.intent,
      surface: decision.surface,
      destination: destinationFromDecision(decision),
      period: periodFromDecision(decision),
    };
  });
  return {
    passed: results.every(result => result.passed),
    total: results.length,
    passedCount: results.filter(result => result.passed).length,
    failed: results.filter(result => !result.passed),
    results,
  };
}

export { runConversationControllerSelfTest };
