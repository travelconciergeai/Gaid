import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
import { tripApi } from '../core/tripApi.jsx';
// Home — conversational landing.
// Two modes:
//   • 'idle': hero with centered chatbar + starters carousel + cards below
//   • 'chat': full chat layout (sidebar still visible) — user/agent messages flow
//             top-to-bottom, chatbar pinned to the BOTTOM and always visible.
//             The Disney wizard renders inline inside agent messages (list of
//             single-click options + "outra opção" free-text field).

const BASE_TRIP_WIZARD = [
  {
    id: 'destination',
    q: 'Para onde você quer viajar?',
    sub: 'Pode ser um destino exato, uma região ou uma ideia ainda aberta.',
    options: [
      { id: 'paris', label: 'Paris', hint: 'clássico, gastronomia e cultura' },
      { id: 'orlando', label: 'Orlando', hint: 'parques, família e descanso bem dosado' },
      { id: 'lisboa', label: 'Lisboa e Porto', hint: 'Portugal com ritmo gostoso' },
      { id: 'japao', label: 'Japão', hint: 'Tóquio, Kyoto e experiências locais' },
      { id: 'praia', label: 'Praia', hint: 'quero sol, mar e descanso' },
    ],
  },
  {
    id: 'period',
    q: 'Quando você imagina viajar?',
    sub: 'Se ainda não tiver data, um mês ou estação já ajuda.',
    options: [
      { id: 'julho', label: 'Julho', hint: 'férias escolares' },
      { id: 'dezembro', label: 'Dezembro', hint: 'fim de ano' },
      { id: 'flexivel', label: 'Datas flexíveis', hint: 'a Gaid pode sugerir melhor janela', recommended: true },
      { id: 'nao-sei', label: 'Ainda não sei', hint: 'vamos deixar em aberto' },
    ],
  },
  {
    id: 'duration',
    q: 'Quantas noites você quer ficar?',
    sub: 'Uso isso para abrir os dias do roteiro sem inventar atividades.',
    options: [
      { id: '3', label: '3 noites', hint: 'escapada curta' },
      { id: '5', label: '5 noites', hint: 'ritmo enxuto' },
      { id: '7', label: '7 noites', hint: 'uma semana completa', recommended: true },
      { id: '10', label: '10+ noites', hint: 'viagem mais profunda' },
    ],
  },
  {
    id: 'travelers',
    q: 'Quem vai viajar?',
    sub: 'Isso muda ritmo, hotel, deslocamentos e experiências.',
    options: [
      { id: 'solo', label: 'Só eu', hint: 'liberdade total' },
      { id: 'couple', label: 'Casal', hint: 'ritmo mais íntimo' },
      { id: 'family', label: 'Família', hint: 'com crianças ou parentes', recommended: true },
      { id: 'friends', label: 'Amigos', hint: 'grupo e energia social' },
    ],
  },
];

const CONTEXTUAL_TRIP_STEPS = {
  familyCount: {
    id: 'travelerCount',
    q: 'Quantas pessoas vão viajar no total?',
    sub: 'Inclua adultos e crianças para eu calibrar quartos, ritmo e logística.',
    options: [
      { id: '3', label: '3 pessoas', hint: 'família pequena' },
      { id: '4', label: '4 pessoas', hint: 'formato clássico', recommended: true },
      { id: '5', label: '5 pessoas', hint: 'precisa de mais estrutura' },
      { id: '6', label: '6+ pessoas', hint: 'grupo familiar maior' },
    ],
  },
  friendsCount: {
    id: 'travelerCount',
    q: 'Quantas pessoas vão viajar?',
    sub: 'Isso ajuda a pensar em quartos, transfers e reservas.',
    options: [
      { id: '3', label: '3 pessoas', hint: 'grupo pequeno' },
      { id: '4', label: '4 pessoas', hint: 'fácil de coordenar', recommended: true },
      { id: '5', label: '5 pessoas', hint: 'mais energia e logística' },
      { id: '6', label: '6+ pessoas', hint: 'grupo maior' },
    ],
  },
  childrenAges: {
    id: 'childrenAges',
    q: 'Qual a idade das crianças?',
    sub: 'Isso muda o ritmo dos dias, pausas, deslocamentos e escolha de hotel.',
    options: [
      { id: 'baby', label: 'Bebê ou toddler', hint: '0 a 3 anos' },
      { id: 'kids', label: 'Crianças', hint: '4 a 11 anos' },
      { id: 'teens', label: 'Adolescentes', hint: '12+ anos' },
      { id: 'mixed', label: 'Idades misturadas', hint: 'precisa equilibrar interesses' },
    ],
  },
  coupleStyle: {
    id: 'stylePace',
    type: 'multiselect',
    q: 'Vocês procuram uma viagem mais romântica, gastronômica, cultural ou um mix?',
    sub: 'Vou usar isso para calibrar experiências, bairros e ritmo.',
    options: [
      { id: 'romance', label: 'Romântica', hint: 'hotéis charmosos, jantares e respiro' },
      { id: 'food', label: 'Gastronômica', hint: 'restaurantes, mercados e experiências locais' },
      { id: 'culture', label: 'Cultural', hint: 'museus, bairros e clássicos bem escolhidos' },
      { id: 'mixed', label: 'Um mix', hint: 'equilíbrio entre tudo', recommended: true },
    ],
  },
  soloObjective: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Qual é o principal objetivo dessa viagem?',
    sub: 'Assim eu monto uma base que combine com seu momento.',
    options: [
      { id: 'reset', label: 'Descansar e resetar', hint: 'ritmo leve e confortável' },
      { id: 'discover', label: 'Explorar bastante', hint: 'dias mais cheios e descobertas' },
      { id: 'food-culture', label: 'Comer bem e ver cultura', hint: 'restaurantes, bairros e museus' },
      { id: 'meet', label: 'Conhecer pessoas', hint: 'experiências sociais e lugares vivos' },
    ],
  },
  friendsVibe: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Qual vibe combina mais com o grupo?',
    sub: 'Grupo bom precisa de roteiro com energia certa e combinados claros.',
    options: [
      { id: 'nightlife', label: 'Vida noturna', hint: 'bares, jantares e agenda mais tarde' },
      { id: 'beach', label: 'Praia e descanso', hint: 'menos deslocamento, mais respiro' },
      { id: 'food', label: 'Gastronomia', hint: 'reservas e experiências locais' },
      { id: 'adventure', label: 'Aventura', hint: 'natureza, passeios e movimento' },
    ],
  },
  orlandoPriority: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Vocês querem focar em parques ou misturar parques e descanso?',
    sub: 'Orlando funciona melhor quando o ritmo é decidido cedo.',
    options: [
      { id: 'parks', label: 'Foco total em parques', hint: 'dias intensos e logística afiada' },
      { id: 'parks-rest', label: 'Parques + descanso', hint: 'equilíbrio para não cansar', recommended: true },
      { id: 'parks-shopping', label: 'Parques + compras', hint: 'outlets e pausas planejadas' },
      { id: 'resort', label: 'Resort e experiências leves', hint: 'menos fila, mais conforto' },
    ],
  },
  japanFamiliarity: {
    id: 'firstTime',
    q: 'É sua primeira vez no Japão ou você já conhece o país?',
    sub: 'Com 10+ noites, isso muda bastante a rota ideal.',
    options: [
      { id: 'first-time', label: 'Primeira vez', hint: 'Tóquio, Kyoto e clássicos essenciais', recommended: true },
      { id: 'returning', label: 'Já conheço', hint: 'dá para ir mais autoral e regional' },
      { id: 'mixed-group', label: 'Grupo misto', hint: 'alguns conhecem, outros não' },
      { id: 'not-sure', label: 'Ainda não sei', hint: 'começamos com uma rota equilibrada' },
    ],
  },
  beachPriority: {
    id: 'tripPriority',
    type: 'multiselect',
    q: 'Na praia, o que importa mais para você?',
    sub: 'Isso define se a base vai ser descanso, natureza ou estrutura.',
    options: [
      { id: 'rest', label: 'Descanso total', hint: 'hotel bom, pouca logística' },
      { id: 'nature', label: 'Natureza e passeios', hint: 'barcos, trilhas leves e paisagens' },
      { id: 'family', label: 'Estrutura para família', hint: 'segurança, piscina e quartos práticos' },
      { id: 'scene', label: 'Lugar com movimento', hint: 'restaurantes, bares e energia' },
    ],
  },
  defaultStyle: {
    id: 'stylePace',
    type: 'multiselect',
    q: 'Qual estilo de viagem você prefere?',
    sub: 'Isso define o ritmo do roteiro.',
    options: [
      { id: 'relaxed', label: 'Mais respiro', hint: 'menos correria, mais tempo livre' },
      { id: 'classic', label: 'Clássicos bem feitos', hint: 'principais atrações com curadoria' },
      { id: 'food-culture', label: 'Gastronomia e cultura', hint: 'restaurantes, arte e bairros' },
      { id: 'mixed', label: 'Misturado', hint: 'equilíbrio entre tudo', recommended: true },
    ],
  },
};

const BUDGET_STEP = {
  id: 'budget',
  q: 'Qual faixa de orçamento combina melhor?',
  sub: 'Não precisa ser exato. É só para calibrar as sugestões.',
  options: [
    { id: 'smart', label: 'Custo-benefício', hint: 'bom padrão sem exageros' },
    { id: 'premium', label: 'Premium', hint: 'conforto e boas escolhas', recommended: true },
    { id: 'luxury', label: 'Luxo', hint: 'hotéis e experiências especiais' },
    { id: 'open', label: 'A definir', hint: 'vamos calibrar depois' },
  ],
};

function answerLabel(answers, key) {
  return answers[key]?.label || '';
}

function answerId(answers, key) {
  return answers[key]?.optId || '';
}

function answerLabels(answers, key) {
  const value = answers[key]?.label;
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function answerIds(answers, key) {
  const value = answers[key]?.optId;
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function normText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function filledString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

function answerText(answers, key) {
  return answerLabels(answers, key).join(', ') || answerIds(answers, key).join(', ') || '';
}

function isMultiField(field) {
  return ['priorities', 'interests', 'tripPriority', 'stylePace', 'experiences'].includes(field);
}

function isMultiStep(step) {
  return step?.type === 'multiselect' || step?.multiple === true || step?.multiselect === true || isMultiField(step?.id);
}

function destinationText(answers) {
  return normText(`${answerIds(answers, 'destination').join(' ')} ${answerLabels(answers, 'destination').join(' ')}`);
}

function isDestination(answers, pattern) {
  return pattern.test(destinationText(answers));
}

function parseNights(answer) {
  const value = Number(answerId(answer, 'duration') || String(answerText(answer, 'duration')).match(/\d+/)?.[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseNumberFromText(value) {
  const match = String(value || '').match(/\d+/);
  const parsed = match ? Number(match[0]) : null;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function travelerCountFrom(answer) {
  const id = answerId(answer, 'travelers');
  if (id === 'solo') return 1;
  if (id === 'couple') return 2;
  const composition = parseTravelerComposition(answerText(answer, 'travelers') || answerText(answer, 'travelerCount'));
  if (composition.count) return composition.count;
  return parseNumberFromText(
    answerId(answer, 'travelerCount') ||
    answerText(answer, 'travelerCount') ||
    answerText(answer, 'travelers') ||
    answerId(answer, 'travelers')
  );
}

function travelerCompositionFrom(answer) {
  const id = answerId(answer, 'travelers');
  if (id === 'solo') return 'Solo';
  if (id === 'couple') return 'Casal';
  if (id === 'family') return 'Família';
  if (id === 'friends') return 'Amigos';
  const label = answerText(answer, 'travelers');
  const text = normText(`${id} ${label}`);
  if (/famil|crianc|filh/.test(text)) return 'Família';
  if (/casal/.test(text)) return 'Casal';
  if (/solo|so eu|sozinh/.test(text)) return 'Solo';
  if (/amig|grupo/.test(text)) return 'Amigos';
  return answerLabel(answer, 'travelers') || null;
}

function parseTravelerComposition(value) {
  const text = normText(value);
  const adults = Number(text.match(/(\d+)\s*adult/)?.[1]) || null;
  const childrenCount = Number(text.match(/(\d+)\s*(crianc|filh)/)?.[1]) || null;
  const ageSection = text.match(/(?:criancas?|filhos?).*?(?:de|com)?\s*((?:\d+\s*(?:,|e|\+)?\s*)+)/)?.[1] || '';
  const ages = [...ageSection.matchAll(/\d+/g)].map(match => Number(match[0])).filter(age => age >= 0 && age <= 17);
  const total = adults || childrenCount ? (adults || 0) + (childrenCount || ages.length || 0) : null;
  return {
    count: total,
    adults,
    children: childrenCount || (ages.length || null),
    ages,
    composition: total || /crianc|filh|famil/.test(text) ? 'Família' : null,
  };
}

const PT_MONTHS = {
  janeiro: 1,
  jan: 1,
  fevereiro: 2,
  fev: 2,
  marco: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  junho: 6,
  jun: 6,
  julho: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setembro: 9,
  set: 9,
  outubro: 10,
  out: 10,
  novembro: 11,
  nov: 11,
  dezembro: 12,
  dez: 12,
};

function isoDate(year, month, day) {
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateRange(value) {
  const label = filledString(value);
  if (!label) return null;
  const numeric = label.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:a|ate|até|-)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i);
  if (numeric) {
    const startYear = Number(numeric[3]?.length === 2 ? `20${numeric[3]}` : numeric[3]);
    const endYear = Number((numeric[6] || numeric[3])?.length === 2 ? `20${numeric[6] || numeric[3]}` : numeric[6] || numeric[3]);
    if (Number.isFinite(startYear) && Number.isFinite(endYear)) {
      return {
        label,
        start: isoDate(startYear, Number(numeric[2]), Number(numeric[1])),
        end: isoDate(endYear, Number(numeric[5]), Number(numeric[4])),
      };
    }
  }
  const text = normText(label);
  const monthName = Object.keys(PT_MONTHS).find(month => text.includes(month));
  const year = Number(text.match(/\b(20\d{2})\b/)?.[1]);
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)].map(match => Number(match[1])).filter(day => day >= 1 && day <= 31);
  if (monthName && Number.isFinite(year) && days.length >= 2) {
    return {
      label,
      start: isoDate(year, PT_MONTHS[monthName], days[0]),
      end: isoDate(year, PT_MONTHS[monthName], days[1]),
    };
  }
  return { label };
}

function cleanDateLabel(value) {
  const label = filledString(value);
  if (!label) return '';
  const text = normText(label);
  if (label.length > 90 || /\b(quero|roteiro|viagem|viajar|criar|montar)\b/.test(text)) return '';
  return label;
}

function normalizeDates(answers, context) {
  const incoming = context?.dates && typeof context.dates === 'object' && !Array.isArray(context.dates) ? context.dates : null;
  const label = filledString(answerText(answers, 'period'), incoming?.label, context?.period);
  const parsed = parseDateRange(label);
  if (incoming || parsed) {
    return {
      ...(incoming || {}),
      ...(parsed || {}),
      label: filledString(parsed?.label, incoming?.label, label),
    };
  }
  return null;
}

function dateDiffNights(dates) {
  if (!dates?.start || !dates?.end) return null;
  const start = new Date(`${dates.start}T00:00:00`);
  const end = new Date(`${dates.end}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function isClearDateLabel(value) {
  const text = normText(value).trim();
  if (!text) return false;
  return ![
    /^a definir$/,
    /^datas flexiveis$/,
    /^flexivel$/,
    /^ainda nao sei$/,
    /^nao sei$/,
  ].some(pattern => pattern.test(text));
}

function isGenericInitialPrompt(value) {
  const text = normText(value).trim();
  if (!text) return true;
  return [
    /^ola\b/,
    /^oi\b/,
    /^quero viajar$/,
    /^quero uma viagem$/,
    /^planejar viagem$/,
    /^criar roteiro$/,
    /^montar roteiro$/,
    /^me ajuda/,
    /^nao sei/,
    /^ainda nao sei/,
  ].some(pattern => pattern.test(text));
}

function initialDestinationAnswer(destination) {
  const label = filledString(destination);
  if (!label) return null;
  return { optId: 'custom', label };
}

function initialAnswersFromContext(context = {}) {
  const next = {};
  const destination = filledString(context.destination);
  if (destination) next.destination = { optId: 'custom', label: destination };
  const datesLabel = filledString(context.dates?.label, context.period);
  if (datesLabel) next.period = { optId: 'custom', label: datesLabel };
  const duration = filledString(context.duration) || (context.nights ? `${context.nights} noites` : '');
  if (duration) next.duration = { optId: 'custom', label: duration };
  const travelerCount = parseNumberFromText(context.travelers?.count);
  const travelerComposition = filledString(context.travelers?.composition, context.travelerComposition);
  if (travelerCount && travelerComposition) {
    next.travelers = { optId: 'custom', label: `${travelerCount} ${travelerCount === 1 ? 'pessoa' : 'pessoas'} · ${travelerComposition}` };
  } else if (travelerComposition) {
    next.travelers = { optId: 'custom', label: travelerComposition };
  }
  const ages = Array.isArray(context.childrenAges)
    ? context.childrenAges
    : Array.isArray(context.travelers?.children?.ages)
      ? context.travelers.children.ages
      : [];
  if (ages.length > 0) next.childrenAges = { optId: 'custom', label: ages.join(', ') };
  return next;
}

function periodStepForDestination(destination) {
  const label = filledString(destination);
  return {
    ...BASE_TRIP_WIZARD[1],
    q: label ? `Quando você imagina viajar para ${label}?` : BASE_TRIP_WIZARD[1].q,
  };
}

function chooseDestinationStep(answers) {
  const nights = parseNights(answers) || 0;
  if (isDestination(answers, /orlando|disney/)) return CONTEXTUAL_TRIP_STEPS.orlandoPriority;
  if (isDestination(answers, /japao|japan|tokyo|toquio|kyoto|quioto/) && nights >= 10) return CONTEXTUAL_TRIP_STEPS.japanFamiliarity;
  if (isDestination(answers, /praia|beach|caribe|nordeste|mar/)) return CONTEXTUAL_TRIP_STEPS.beachPriority;
  return null;
}

function chooseTravelerStep(answers) {
  const travelers = answerId(answers, 'travelers');
  if (travelers === 'couple') return CONTEXTUAL_TRIP_STEPS.coupleStyle;
  if (travelers === 'solo') return CONTEXTUAL_TRIP_STEPS.soloObjective;
  if (travelers === 'friends') return CONTEXTUAL_TRIP_STEPS.friendsVibe;
  return CONTEXTUAL_TRIP_STEPS.defaultStyle;
}

function buildAdaptiveTripWizard(answers) {
  const steps = [...BASE_TRIP_WIZARD];
  const travelers = answerId(answers, 'travelers');
  const composition = parseTravelerComposition(answerText(answers, 'travelers'));
  const clearFamilyComposition = composition.composition === 'Família' && composition.count && (composition.children || composition.ages.length > 0);
  if (travelers === 'family' || clearFamilyComposition) {
    if (!clearFamilyComposition) steps.push(CONTEXTUAL_TRIP_STEPS.familyCount);
    if (answerId(answers, 'travelerCount') && !clearFamilyComposition) {
      steps.push(CONTEXTUAL_TRIP_STEPS.childrenAges);
    }
    if (answerId(answers, 'childrenAges') || clearFamilyComposition) {
      const destinationStep = chooseDestinationStep(answers);
      if (destinationStep) steps.push(destinationStep);
      if (!destinationStep || (destinationStep.id === 'firstTime' && answerId(answers, 'firstTime'))) {
        steps.push(CONTEXTUAL_TRIP_STEPS.defaultStyle);
      }
    }
  } else if (travelers === 'friends') {
    steps.push(CONTEXTUAL_TRIP_STEPS.friendsCount);
    if (answerId(answers, 'travelerCount')) {
      const destinationStep = chooseDestinationStep(answers);
      if (destinationStep) steps.push(destinationStep);
      steps.push(CONTEXTUAL_TRIP_STEPS.friendsVibe);
    }
  } else if (travelers) {
    const destinationStep = chooseDestinationStep(answers);
    if (destinationStep) steps.push(destinationStep);
    if (!destinationStep || (destinationStep.id === 'firstTime' && answerId(answers, 'firstTime'))) {
      steps.push(chooseTravelerStep(answers));
    }
  }
  steps.push(BUDGET_STEP);
  return steps;
}

function mergeWizardContext(base, patch) {
  const out = { ...(base || {}) };
  Object.entries(patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = mergeWizardContext(out[key], value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

function aiQuestionToStep(question) {
  if (!question || question.isComplete || !question.question) return null;
  const field = question.field || 'notes';
  const inputType = question.type || question.inputType;
  const multi = question.multiselect === true || question.multiple === true || inputType === 'multiselect' || isMultiField(field);
  return {
    id: field,
    type: multi ? 'multiselect' : inputType,
    q: question.question,
    sub: 'Escolha uma opção ou descreva com suas palavras.',
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
        id: option.id || option.label,
        label: option.label || option.id,
        hint: '',
      })).filter(option => option.label)
      : [],
    allowFreeText: question.allowFreeText !== false,
  };
}

function syncWizardHistory(history, index, currentStep, nextStep) {
  const next = [...history];
  if (currentStep) next[index] = currentStep;
  if (nextStep) next[index + 1] = nextStep;
  return next;
}

function hasClearTravelerComposition(answers) {
  const composition = parseTravelerComposition(answerText(answers, 'travelers'));
  return composition.composition === 'Família' && composition.count && (composition.children || composition.ages.length > 0);
}

function fieldKnown(field, answers, context = {}) {
  if (!field) return false;
  const dates = normalizeDates(answers, context);
  const parsedTravelers = parseTravelerComposition(`${answerText(answers, 'travelers')} ${answerText(answers, 'travelerCount')} ${answerText(answers, 'childrenAges')}`);
  const travelerCount = travelerCountFrom(answers) ?? parsedTravelers.count ?? parseNumberFromText(context.travelers?.count);
  const travelerComposition = filledString(travelerCompositionFrom(answers), parsedTravelers.composition, context.travelerComposition, context.travelers?.composition);
  const childrenAges = parsedTravelers.ages.length > 0
    ? parsedTravelers.ages
    : Array.isArray(context.childrenAges)
      ? context.childrenAges
      : Array.isArray(context.travelers?.children?.ages)
        ? context.travelers.children.ages
        : [];

  switch (field) {
    case 'destination':
      return !!filledString(answerText(answers, 'destination'), context.destination);
    case 'period':
    case 'dates':
      return !!(dates?.start && dates?.end) || isClearDateLabel(dates?.label);
    case 'duration':
      return !!(parseNights(answers) ?? context.nights ?? parseNumberFromText(context.duration) ?? dateDiffNights(dates));
    case 'travelers':
    case 'travelerCount':
      return !!(travelerCount && travelerComposition);
    case 'childrenAges':
      return childrenAges.length > 0 || hasClearTravelerComposition(answers);
    case 'budget':
      return !!filledString(answerText(answers, 'budget'), context.budget?.label, context.budget, context.comfortLevel);
    default:
      return false;
  }
}

function shouldSkipWizardStep(step, answers, context = {}) {
  if (!step) return false;
  return fieldKnown(step.id, answers, context);
}

function nextUnknownStepIndex(steps, startIndex, answers, context = {}) {
  return steps.findIndex((step, index) => index >= startIndex && !shouldSkipWizardStep(step, answers, context));
}

async function requestAiWizardQuestion({ prompt, answers, context, lastAnswer, stepCount }) {
  const response = await fetch('/api/wizard-next', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, answers, context, lastAnswer, stepCount }),
  });
  if (!response.ok) throw new Error('wizard-next failed');
  return response.json();
}

async function requestNextUnknownAiStep({ prompt, answers, context, lastAnswer, stepCount }) {
  let nextContext = context || {};
  let lastResponse = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await requestAiWizardQuestion({
      prompt,
      answers,
      context: nextContext,
      lastAnswer,
      stepCount: stepCount + attempt,
    });
    nextContext = mergeWizardContext(nextContext, response.normalizedPatch);
    lastResponse = response;
    const step = aiQuestionToStep(response);
    if (response.isComplete || !shouldSkipWizardStep(step, answers, nextContext)) {
      return { response, context: nextContext, step };
    }
  }
  return { response: lastResponse, context: nextContext, step: null };
}

function buildWizardQa(answers, history = []) {
  const seen = new Set();
  return (history || [])
    .filter(step => step && answers?.[step.id] && !seen.has(step.id))
    .map((step) => {
      seen.add(step.id);
      return {
        question: step.q,
        answer: answerText(answers, step.id),
      };
    })
    .filter(item => item.question && item.answer);
}

function wizardQaText(step, label) {
  return `P: ${step?.q || 'Pergunta'}\nR: ${label}`;
}

function sentenceList(values) {
  const items = values.flatMap(value => Array.isArray(value) ? value : [value]).map(value => filledString(value)).filter(Boolean);
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function buildWizardSummary(context) {
  const destination = filledString(context.destination, 'uma viagem');
  const dates = cleanDateLabel(context.dates?.label) || cleanDateLabel(context.period);
  const count = parseNumberFromText(context.travelers?.count);
  const composition = filledString(context.travelers?.composition, context.travelerComposition);
  const travelerText = context.travelers?.adults && context.travelers?.children?.count
    ? `${context.travelers.adults} adultos e ${context.travelers.children.count} crianças${context.travelers.children.ages?.length ? ` de ${sentenceList(context.travelers.children.ages.map(String))} anos` : ''}`
    : count
    ? `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`
    : composition || '';
  const budget = filledString(
    typeof context.budget === 'object' ? context.budget?.label : context.budget,
    context.comfortLevel
  );
  const style = Array.isArray(context.stylePace) ? context.stylePace : filledString(context.stylePace);
  const priorities = Array.isArray(context.priorities) ? context.priorities : [];
  const focus = sentenceList([style, ...priorities].filter(Boolean));
  const parts = [`Quero criar um roteiro para ${destination}`];
  if (dates) parts.push(`de ${dates}`);
  if (travelerText) parts.push(`para ${travelerText}`);
  const qualifiers = sentenceList([
    budget ? `uma viagem ${budget}` : '',
    focus ? `foco em ${focus}` : '',
  ]);
  if (qualifiers) parts.push(`com ${qualifiers}`);
  return `${parts.join(', ')}.`;
}

function buildTripContext(answers, prompt, { context = {}, mode = 'deterministic', qa = [] } = {}) {
  const destination = filledString(answerText(answers, 'destination'), context.destination);
  const period = cleanDateLabel(answerText(answers, 'period')) || cleanDateLabel(context.period) || cleanDateLabel(context.dates?.label);
  const dates = normalizeDates(answers, { ...context, period });
  const parsedComposition = parseTravelerComposition(`${answerText(answers, 'travelers')} ${answerText(answers, 'travelerCount')} ${answerText(answers, 'childrenAges')}`);
  const childrenAges = parsedComposition.ages.length > 0
    ? parsedComposition.ages
    : filledString(answerText(answers, 'childrenAges'), context.childrenAges) || null;
  const travelerCount = travelerCountFrom(answers);
  const contextTravelerCount = parseNumberFromText(context.travelers?.count);
  const travelerComposition = filledString(travelerCompositionFrom(answers), context.travelerComposition, context.travelers?.composition);
  const budget = filledString(answerText(answers, 'budget'), context.budget?.label, context.budget);
  const stylePace = answerLabels(answers, 'stylePace').length > 0 ? answerLabels(answers, 'stylePace') : filledString(context.stylePace) || null;
  const priorities = [
    ...answerLabels(answers, 'tripPriority'),
    ...answerLabels(answers, 'priorities'),
    ...answerLabels(answers, 'interests'),
    ...answerLabels(answers, 'experiences'),
    filledString(context.tripPriority),
    filledString(answerText(answers, 'firstTime'), context.firstTime),
    ...(Array.isArray(context.priorities) ? context.priorities : []),
  ].filter(Boolean);
  return {
    ...context,
    prompt,
    destination: destination || null,
    period: period || null,
    dates,
    nights: parseNights(answers) ?? context.nights ?? null,
    duration: filledString(answerText(answers, 'duration'), context.duration) || null,
    travelers: {
      ...(context.travelers && typeof context.travelers === 'object' && !Array.isArray(context.travelers) ? context.travelers : {}),
      count: travelerCount ?? parsedComposition.count ?? contextTravelerCount ?? null,
      composition: travelerComposition || null,
      adults: parsedComposition.adults ?? context.travelers?.adults ?? null,
      children: {
        count: parsedComposition.children ?? context.travelers?.children?.count ?? null,
        ages: parsedComposition.ages.length > 0 ? parsedComposition.ages : context.travelers?.children?.ages ?? [],
      },
    },
    travelerComposition: travelerComposition || null,
    childrenAges,
    comfortLevel: budget || context.comfortLevel || null,
    budget: budget || context.budget || null,
    stylePace: stylePace || null,
    priorities,
    tripPriority: answerLabels(answers, 'tripPriority').length > 0 ? answerLabels(answers, 'tripPriority') : filledString(context.tripPriority) || null,
    firstTime: filledString(answerText(answers, 'firstTime'), context.firstTime) || null,
    wizard: {
      completed: true,
      mode,
      originalPrompt: prompt,
      qa,
      answers,
    },
  };
}

const HomeScreen = ({ setRoute, kickoffPlan, setActiveTripId, activeTrip }) => {
  const acct = useAccount();
  const hasTrip = !!activeTrip;
  const liveTrip = activeTrip;
  const greetName = acct.user.firstName;
  const { summaries: _trips } = useTrips();
  const tripsCount = _trips.length;
  const inspoQ = useCatalog('templates');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState('idle');                    // idle | chat
  const [chat, setChat] = useState([]);                        // [{ id, who, text? wizardStep? answered? generating? }]
  const [wizardStep, setWizardStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('asking');                // asking | generating | done
  const [flowKey, setFlowKey] = useState('trip');              // trip | disney | kids | dog
  const [initialPrompt, setInitialPrompt] = useState('');
  const [aiWizardQuestion, setAiWizardQuestion] = useState(null);
  const [wizardContext, setWizardContext] = useState({});
  const [wizardHistory, setWizardHistory] = useState([]);
  const toast = useToast();
  const scrollerRef = useRef(null);

  // Flow configs — each maps to a wizard, a generation script, and a target trip.
  const FLOW_CFG = {
    trip: { wizardKey:'tripWizard', genKey:'genSteps', tripKey:'trip',
      intro:'Perfeito. Vou te fazer algumas perguntas rápidas para montar a base do seu roteiro.' },
    disney: { wizardKey:'disneyWizard', genKey:'genSteps',     tripKey:'disneyTrip',
      intro:'Disney em família é uma das minhas especialidades. Vou te perguntar algumas coisas rápidas — clica numa opção ou descreve com suas palavras.' },
    kids:   { wizardKey:'kidsWizard',   genKey:'genStepsKids', tripKey:'disneyTrip',
      intro:'Viajar com crianças tem mil detalhes — documentos, carrinho, ritmo — e é exatamente aí que eu brilho. 3 perguntas rápidas e eu penso no resto por você.' },
    dog:    { wizardKey:'dogWizard',    genKey:'genStepsDog',  tripKey:'dogTrip',
      intro:'Viajar com cachorro pra Europa tem prazos que começam ~30 dias antes. Vou fazer 3 perguntas e montar tudo — documentos, voo na cabine, hotéis pet-friendly e pontos de atenção.' },
  };
  const cfg = FLOW_CFG[flowKey] || FLOW_CFG.trip;
  const deterministicWizard = flowKey === 'trip' ? buildAdaptiveTripWizard(answers) : [];
  const wizard = flowKey === 'trip'
    ? (wizardHistory.length
      ? Array.from(
        { length: Math.max(deterministicWizard.length, wizardHistory.length) },
        (_, index) => wizardHistory[index] || deterministicWizard[index]
      ).filter(Boolean)
      : deterministicWizard)
    : [];

  const detectFlow = (t) => {
    const s = (t || '').toLowerCase();
    if (/cachorr|c[ãa]o\b|c[ãa]es|pet\b|cadela|cadelo|dog|\bau\b/.test(s)) return 'dog';
    if (/filho|filha|crian|fam[ií]lia|kids|beb[êe]|netos?/.test(s)) return 'kids';
    if (s.includes('disney')) return 'disney';
    return null;
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [chat, thinking]);

  // ---- flow control ----
  const startFlow = (userText, key) => {
    setFlowKey(key);
    setInitialPrompt(userText);
    setAnswers({});
    setAiWizardQuestion(null);
    setWizardContext({});
    setWizardHistory([]);
    setMode('chat');
    setChat([{ id: 'u-0', who: 'user', text: userText }]);
    setThinking(true);
    setTimeout(async () => {
      let initialAnswers = {};
      let initialContext = {};
      let initialHistory = [];
      let firstWizardStep = 0;
      let firstAiQuestion = null;

      if (key === 'trip') {
        try {
          const result = await requestNextUnknownAiStep({
            prompt: userText,
            answers: {},
            context: {},
            lastAnswer: null,
            stepCount: 0,
          });
          initialContext = result.context;
          firstAiQuestion = result.response;
        } catch (_error) {
          initialContext = {};
        }
        const promptDates = parseDateRange(userText);
        if (!initialContext.dates && (promptDates?.start || isClearDateLabel(promptDates?.label))) {
          initialContext = {
            ...initialContext,
            dates: promptDates,
            period: promptDates.label,
          };
        }
        if (!initialContext.destination && !promptDates?.start && !isClearDateLabel(promptDates?.label) && !isGenericInitialPrompt(userText)) {
          initialContext = { ...initialContext, destination: userText };
        }

        initialAnswers = initialAnswersFromContext(initialContext);
        const firstAiStep = aiQuestionToStep(firstAiQuestion);
        const deterministic = buildAdaptiveTripWizard(initialAnswers);
        const firstUnknownIndex = nextUnknownStepIndex(deterministic, 0, initialAnswers, initialContext);
        if (firstUnknownIndex >= 0) {
          firstWizardStep = firstUnknownIndex;
          initialHistory = deterministic.slice(0, firstUnknownIndex + 1);
        }

        if (firstAiStep && !shouldSkipWizardStep(firstAiStep, initialAnswers, initialContext)) {
          initialHistory = syncWizardHistory(initialHistory, firstWizardStep - 1, initialHistory[firstWizardStep - 1], firstAiStep);
        } else if (firstUnknownIndex < 0) {
          const destinationAnswer = initialAnswers.destination;
          const nextStep = destinationAnswer ? periodStepForDestination(destinationAnswer.label) : BASE_TRIP_WIZARD[0];
          initialHistory = [nextStep];
          firstWizardStep = 0;
        }
      }

      setAnswers(initialAnswers);
      setWizardContext(initialContext);
      setAiWizardQuestion(firstAiQuestion);
      setWizardHistory(initialHistory);
      setThinking(false);
      setChat(c => [
        ...c,
        { id: 'a-intro', who: 'agent', text: FLOW_CFG[key].intro },
        { id: `q-${firstWizardStep}`, who: 'agent', wizardStep: firstWizardStep },
      ]);
      setWizardStep(firstWizardStep);
      setPhase('asking');
    }, 700);
  };

  const sendToGaid = async (message, baseChat = []) => {
    setThinking(true);
    try {
      const response = await tripApi.sendChatMessage({
        message,
        history: baseChat
          .filter(m => m.text)
          .map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', text: m.text })),
        context: { surface: 'home' },
      });
      setChat(c => [...c, { id: `a-${Date.now()}`, who: 'agent', text: response.text, source: response.source }]);
    } catch (_error) {
      setChat(c => [...c, {
        id: `a-${Date.now()}`,
        who: 'agent',
        text: 'Não consegui responder agora. Tente novamente em instantes.',
        source: 'error',
      }]);
    } finally {
      setThinking(false);
    }
  };

  const submit = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput('');

    // From idle: collect the core trip context before creating the real trip.
    if (mode === 'idle') {
      startFlow(t, 'trip');
      return;
    }

    // In chat mode: if currently asking a wizard question, free-text counts as answer.
    if (phase === 'asking' && wizard.length > 0) {
      answerWizard('custom', t);
    } else {
      const userMsg = { id: `u-${Date.now()}`, who: 'user', text: t };
      const nextChat = [...chat, userMsg];
      setChat(nextChat);
      sendToGaid(t, nextChat);
    }
  };

  const answerWizard = (optId, label) => {
    const step = wizard[wizardStep];
    if (!step) return;
    const nextAnswers = { ...answers, [step.id]: { optId, label } };
    const currentWizardHistory = syncWizardHistory(wizardHistory, wizardStep, step);
    const currentQa = buildWizardQa(nextAnswers, currentWizardHistory);
    setAnswers(nextAnswers);
    setWizardHistory(currentWizardHistory);
    // Lock the current wizard message. Answers stay inside the guided form.
    setChat(c => [
      ...c.map(m => (m.wizardStep === wizardStep ? { ...m, answered: { optId, label } } : m)),
    ]);
    setThinking(true);
    setTimeout(async () => {
      let nextWizard = flowKey === 'trip' ? buildAdaptiveTripWizard(nextAnswers) : wizard;
      let completedByAi = false;
      let nextAiStep = null;
      let nextWizardContext = wizardContext;

      if (flowKey === 'trip') {
        try {
          const result = await requestNextUnknownAiStep({
            prompt: initialPrompt,
            answers: nextAnswers,
            context: wizardContext,
            lastAnswer: { field: step.id, value: optId, label },
            stepCount: wizardStep + 1,
          });
          const response = result.response;
          nextWizardContext = result.context;
          setWizardContext(nextWizardContext);
          setAiWizardQuestion(response);
          completedByAi = response.isComplete === true;
          nextAiStep = result.step;
          if (nextAiStep) {
            nextWizard = syncWizardHistory(currentWizardHistory, wizardStep, step, nextAiStep);
            setWizardHistory(nextWizard);
          }
        } catch (_error) {
          nextWizardContext = wizardContext;
          completedByAi = false;
          nextWizard = buildAdaptiveTripWizard(nextAnswers);
          setAiWizardQuestion(null);
        }
      }

      setThinking(false);
      const next = nextUnknownStepIndex(nextWizard, wizardStep + 1, nextAnswers, nextWizardContext);
      if (!completedByAi && next >= 0) {
        setWizardStep(next);
        setChat(c => [...c, { who: 'agent', wizardStep: next }]);
      } else {
        // Finished — create the trip with the collected context and open Plan.
        setPhase('generating');
        const genMsg = 'Perfeito. Vou abrir a base do seu roteiro agora.';
        setChat(c => [
          ...c,
          { who: 'agent', text: genMsg },
        ]);
        const mode = completedByAi ? 'ai-guided' : 'deterministic';
        const fallbackContext = buildTripContext(nextAnswers, initialPrompt, {
          context: nextWizardContext,
          mode,
          qa: currentQa,
        });
        const summary = buildWizardSummary(fallbackContext);
        const handoffContext = {
          ...fallbackContext,
          wizard: {
            ...fallbackContext.wizard,
            summary,
          },
        };
        Promise.resolve(kickoffPlan && kickoffPlan({
          prompt: summary,
          context: handoffContext,
        }))
          .then(() => {
            setRoute && setRoute('plan');
          })
          .catch(() => {
            setPhase('done');
            setChat(c => [...c, {
              id: `a-${Date.now()}`,
              who: 'agent',
              text: 'Não consegui criar sua viagem agora. Tente novamente em instantes.',
              source: 'error',
            }]);
          });
      }
    }, 700);
  };

  const onGenerationDone = () => {
    // Generation is backend-driven; nothing fabricated here. Open the plan.
    setRoute && setRoute('plan');
  };

  const openGeneratedTrip = (tripId) => {
    setActiveTripId && setActiveTripId(tripId);
    setRoute('plan');
    setTimeout(() => {
      setMode('idle');
      setChat([]);
      setWizardStep(0);
      setAnswers({});
      setAiWizardQuestion(null);
      setWizardContext({});
      setWizardHistory([]);
      setPhase('asking');
    }, 400);
  };

  const exitChat = () => {
    setMode('idle');
    setChat([]);
    setWizardStep(0);
    setAnswers({});
    setAiWizardQuestion(null);
    setWizardContext({});
    setWizardHistory([]);
    setPhase('asking');
  };

  // ---- render ----
  if (mode === 'chat') {
    return (
      <div className="h-screen flex flex-col bg-canvas">
        {/* slim header */}
        <header className="px-10 pt-6 pb-4 flex items-center justify-between gap-4">
          <button onClick={exitChat}
            className="h-9 px-3 rounded-lg text-[12.5px] text-ink-700 hover:bg-ink-100 inline-flex items-center gap-1.5">
            <Icon.ChevronLeft size={14}/> Voltar ao início
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-ink-900 text-paper flex items-center justify-center">
              <Icon.Logo size={12}/>
            </div>
            <div>
              <div className="text-[13px] font-medium text-ink-900 leading-tight">Gaid · concierge</div>
              <div className="text-[10.5px] text-ink-500 leading-tight">montando seu roteiro</div>
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={Icon.X} onClick={exitChat}>Sair</Button>
        </header>

        {/* chat scroll */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-10">
          <div className="max-w-[780px] mx-auto py-6 space-y-6">
            {chat.map((m, i) => (
              <ChatMsg key={m.id || i} m={m}
                wizard={wizard}
                genSteps={[]}
                onAnswer={answerWizard}
                onGenDone={onGenerationDone}
                onOpenTrip={openGeneratedTrip}/>
            ))}
            {thinking && (
              <div className="flex gap-1 pt-1 pl-1">
                <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
                <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
                <span className="dot h-1.5 w-1.5 rounded-full bg-ink-400"/>
              </div>
            )}
          </div>
        </div>

        {/* bottom chatbar — always visible */}
        <div className="px-10 pb-6 pt-3 bg-gradient-to-t from-canvas via-canvas to-canvas/0">
          <div className="max-w-[780px] mx-auto">
            <div className="bg-white border-half rounded-full shadow-card h-[56px] pl-5 pr-[6px] flex items-center gap-2 transition-shadow hover:shadow-lift focus-within:shadow-lift">
              <Icon.Sparkles size={15} className="text-ink-500 shrink-0"/>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder={phase === 'generating' ? 'Aguarde a Gaid terminar…' : 'Responda ou pergunte qualquer coisa…'}
                disabled={phase === 'generating'}
                className="flex-1 h-full outline-none text-[14px] placeholder:text-ink-400 bg-transparent leading-none disabled:opacity-50"/>
              <button className="h-9 w-9 rounded-full hover:bg-ink-100 text-ink-600 flex items-center justify-center shrink-0" title="Anexar">
                <Icon.Plus size={15}/>
              </button>
              <button onClick={() => submit()} disabled={phase === 'generating'}
                className="h-11 px-5 rounded-full bg-ink-900 text-paper hover:bg-ink-800 transition-colors flex items-center gap-2 text-[13.5px] font-medium shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon.Send size={14}/>
                Enviar
              </button>
            </div>
            <div className="mt-2 text-[11px] text-ink-500 text-center">
              {phase === 'asking'
                ? 'Você pode clicar numa opção acima ou digitar sua própria resposta aqui.'
                : phase === 'generating'
                  ? 'A Gaid está finalizando — chat volta em instantes.'
                  : ' '}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== IDLE MODE =====
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-10 pt-8 pb-2 flex items-center justify-end gap-2">
        <Button variant="ghost" icon={Icon.Bell}>Atualizações</Button>
        <Button variant="secondary" icon={Icon.Plus} onClick={() => setRoute('trips')}>Nova viagem</Button>
      </header>

      <section className="px-10 pt-2 pb-10">
        <div className="max-w-[860px] mx-auto text-center">
          <Tag tone="brand" className="mx-auto"><Icon.Sparkles size={12}/> Concierge premium · IA + experts reais</Tag>
          <h2 className="mt-5 text-[52px] leading-[1.04] tracking-[-0.025em] font-medium text-ink-900">
            {greetName ? `Olá, ${greetName}!` : 'Olá!'}
            <br/>
            <span className="serif-i">Qual será a sua próxima viagem?</span>
          </h2>

          <div className="mt-9 mx-auto max-w-[720px]">
            <div className="bg-white border-half rounded-full shadow-card h-[60px] pl-5 pr-[6px] flex items-center gap-3 transition-shadow hover:shadow-lift focus-within:shadow-lift">
              <Icon.Sparkles size={16} className="text-ink-500 shrink-0"/>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Quer viajar? A Gaid tem um roteiro para você."
                className="flex-1 h-full outline-none text-[15px] placeholder:text-ink-400 bg-transparent leading-none"/>
              <button className="h-10 w-10 rounded-full hover:bg-ink-100 text-ink-600 flex items-center justify-center shrink-0" title="Voz">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
                </svg>
              </button>
              <button onClick={() => submit()}
                className="h-12 px-5 rounded-full bg-ink-900 text-paper hover:bg-ink-800 transition-colors flex items-center gap-2 text-[14px] font-medium shrink-0">
                <Icon.Send size={15}/>
                {thinking ? 'Pensando…' : 'Pedir'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {hasTrip ? (
      <section className="px-10 pb-12 grid grid-cols-[1.4fr_1fr] gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label">Continuar onde parou</div>
              <div className="text-[17px] font-medium tracking-tight text-ink-900 mt-1">{liveTrip.title}</div>
              <div className="text-[12.5px] text-ink-500 mt-0.5">{liveTrip.dates} · {liveTrip.travelers} viajantes</div>
            </div>
            <div className="flex items-center gap-2">
              <OptimizeMenu onApply={(m) => { toast({title:`Otimizando · ${m.label}`, desc: m.delta || 'Aplicando…', tone:'success'}); setTimeout(() => setRoute('plan'), 500); }}/>
              <Button variant="secondary" iconRight={Icon.ArrowRight} onClick={() => setRoute('plan')}>Abrir</Button>
            </div>
          </div>

          <SmartImg src={liveTrip.coverImage?.url} seed={liveTrip.coverSeed} tone={liveTrip.cover} label={liveTrip.coverLabel} w={800} h={420} className="h-[180px] rounded-xl"/>

          <div className="mt-5 grid grid-cols-2 gap-6">
            <Stat label="Progresso" value={`${liveTrip.progress}%`} hint={`${liveTrip.days?.length || 0} dias planejados`}/>
            <Stat label="Estimativa" value={liveTrip.budget} hint="vs. orçamento" tone="sage"/>
          </div>

          <div className="mt-5 flex items-center gap-2 text-[12.5px] text-ink-600">
            <Icon.Sparkles size={14} className="text-ink-900"/>
            <span>{liveTrip.insights?.[0]?.text || 'Quer abrir o roteiro?'}</span>
            <button onClick={() => { setRoute('plan'); }}
                    className="ml-auto text-ink-900 hover:underline font-medium">Ver</button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label">Sua Gaid hoje</div>
              <div className="text-[17px] font-medium tracking-tight text-ink-900 mt-1">Resumo</div>
            </div>
            <Tag tone="brand">ao vivo</Tag>
          </div>
          <div className="space-y-3">
            <Row icon={Icon.Coins} label="Milhas totais" value={acct.user.miles.toLocaleString('pt-BR')} hint={acct.user.miles ? 'total acumulado' : 'conecte programas'}/>
            <Row icon={Icon.Wallet} label="Cartões na carteira" value={(acct.cards || []).length} hint="conecte na Wallet"/>
            <Row icon={Icon.Calendar} label="Viagens" value={tripsCount} hint="no seu histórico"/>
            <Row icon={Icon.Shield} label="Seguro" value={TBD} hint="" tone="sage"/>
          </div>
        </Card>
      </section>
      ) : (
        <HomeFirstRun acct={acct} setRoute={setRoute} onPickIdea={(label) => submit(label)}/>
      )}

      <section className="px-10 pb-16">
        <SectionHeader eyebrow="Inspiração editorial" title="Roteiros que combinam com você"
          action={<Button variant="ghost" iconRight={Icon.ArrowRight} onClick={() => setRoute('explore')}>Explorar todos</Button>}/>
        <CatalogCarousel
          query={inspoQ}
          itemClass="w-[300px]"
          empty={<EmptyState icon={Icon.Compass} eyebrow="Inspiração"
            title="Roteiros sob medida aparecem aqui"
            desc="Conte pra Gaid o que você procura e ela cura roteiros assinados por experts — em carrossel, prontos pra adaptar."
            primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Gaid</Button>}/>}
          render={(r) => (
            <button key={r.id} onClick={() => setRoute('explore')}
              className="bg-white border-half rounded-2xl overflow-hidden text-left card-h flex flex-col h-[360px] w-full">
              <SmartImg seed={`route-${r.id}`} tone={r.tone} label={r.category} w={500} h={300} className="h-[170px] w-full shrink-0"/>
              <div className="p-4 flex flex-col flex-1">
                <div className="text-[10.5px] uppercase tracking-wider text-ink-500 mb-1">{orTBD(r.category)}</div>
                <div className="text-[14.5px] font-medium text-ink-900 leading-snug line-clamp-2">{orTBD(r.title)}</div>
                {has(r.expert) && <div className="text-[11.5px] text-ink-500 mt-2 flex items-center gap-1.5"><Icon.Sparkles size={11} className="text-ink-900"/> Por {r.expert}</div>}
                <div className="mt-auto pt-3 text-[12px] text-ink-500 flex items-center justify-between">
                  <span className="whitespace-nowrap">{has(r.days) ? `${r.days} dias` : TBD}</span>
                  <span className="whitespace-nowrap">desde <span className="text-ink-900 font-medium">{orTBD(r.from)}</span></span>
                </div>
              </div>
            </button>
          )}
        />
      </section>

      <footer className="px-10 pb-10 pt-2">
        <div className="text-[12px] text-ink-500 flex items-center gap-2 justify-center">
          <Icon.Lock size={11}/> A Gaid nunca compartilha o que você está planejando.
        </div>
      </footer>
    </div>
  );
};

// ============ Chat message renderer ============
// Switches between user bubbles, plain agent text, inline wizard, and inline gen card.
const ChatMsg = ({ m, wizard, genSteps, onAnswer, onGenDone, onOpenTrip }) => {
  if (m.who === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-ink-900 text-paper rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] max-w-[80%] leading-relaxed whitespace-pre-line">
          {m.text}
        </div>
      </div>
    );
  }

  // agent message
  if (typeof m.wizardStep === 'number') {
    return (
      <InlineWizard
        stepIdx={m.wizardStep}
        wizard={wizard}
        step={wizard[m.wizardStep]}
        answered={m.answered}
        onPick={(optId, label) => onAnswer(optId, label)}
      />
    );
  }

  if (m.generating) {
    return (
      <div className="fade-up">
        <GeneratingCard
          steps={genSteps}
          totalDuration={30000}
          onDone={onGenDone}
          onSkip={onGenDone}
          embedded
        />
      </div>
    );
  }

  if (m.prep) {
    return <PrepBriefing flowKey={m.prep}/>;
  }

  if (m.tripReady) {
    return <TripReadyInline tripId={m.tripReady} onOpen={onOpenTrip}/>;
  }

  // plain agent text
  return (
    <div className="text-[14.5px] text-ink-900 leading-relaxed max-w-[85%]">
      {m.text}
    </div>
  );
};

// ============ Inline wizard question ============
// Rendered as an agent message inside the chat. Vertical list of options +
// an "Outra opção" free-text input. Collapses once answered.
const InlineWizard = ({ stepIdx, step, wizard, answered, onPick }) => {
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState([]);
  if (!step) return null;
  const total = (wizard || []).length;
  const multi = isMultiStep(step);
  const options = Array.isArray(step.options) ? step.options : [];
  const answeredText = Array.isArray(answered?.label) ? sentenceList(answered.label) : answered?.label;

  const toggle = (option) => {
    setSelected(prev => prev.some(item => item.id === option.id)
      ? prev.filter(item => item.id !== option.id)
      : [...prev, { id: option.id, label: option.label }]
    );
  };

  const confirmMulti = () => {
    if (selected.length === 0 && !custom.trim()) return;
    const customOption = custom.trim() ? [{ id: 'custom', label: custom.trim() }] : [];
    const values = [...selected, ...customOption];
    onPick(values.map(item => item.id), values.map(item => item.label));
    setSelected([]);
    setCustom('');
  };

  if (answered) {
    return (
      <div className="text-[12.5px] text-ink-500 flex items-center gap-2 pl-1">
        <Icon.Check size={12} className="text-ink-900"/>
        <span>{step.q.replace('?','')} → <span className="text-ink-900 font-medium">{answeredText}</span></span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[600px]">
      <div>
        <div className="text-[15.5px] text-ink-900 font-medium leading-snug">{step.q}</div>
        <div className="text-[12.5px] text-ink-500 mt-1">{step.sub}</div>
      </div>

      <ul className="space-y-1.5">
        {options.map(o => {
          const on = selected.some(item => item.id === o.id);
          return (
          <li key={o.id}>
            <button onClick={() => multi ? toggle(o) : onPick(o.id, o.label)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-white border-half hover:border-ink-900 hover:bg-ink-50 transition-colors group ${on ? 'border-ink-900 bg-ink-50' : ''}`}>
              <div className={`h-6 w-6 ${multi ? 'rounded-md' : 'rounded-full'} border-half flex items-center justify-center transition-colors shrink-0 ${
                on ? 'bg-ink-900 text-paper border-ink-900' : 'text-ink-400 group-hover:border-ink-900 group-hover:text-ink-900'
              }`}>
                {multi && on ? <Icon.Check size={12}/> : <Icon.ChevronRight size={12}/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-ink-900 leading-tight">{o.label}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{o.hint}</div>
              </div>
              {o.recommended && (
                <span className="text-[10px] font-medium px-1.5 h-5 rounded-full bg-ink-900 text-paper flex items-center whitespace-nowrap shrink-0">recomendado</span>
              )}
            </button>
          </li>
          );
        })}
      </ul>

      {/* Outra opção — free text */}
      <div className="bg-paper border-half border-dashed rounded-xl px-4 py-2.5 flex items-center gap-3">
        <Icon.Edit size={13} className="text-ink-500 shrink-0"/>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { multi ? confirmMulti() : onPick('custom', custom.trim()); setCustom(''); } }}
          placeholder="Outra opção · descreva com suas palavras…"
          className="flex-1 outline-none text-[13px] bg-transparent placeholder:text-ink-500"/>
        {custom.trim() && (
          <button onClick={() => { multi ? confirmMulti() : onPick('custom', custom.trim()); setCustom(''); }}
            className="h-7 px-2.5 rounded-md bg-ink-900 text-paper text-[11.5px] font-medium hover:bg-ink-800 transition-colors inline-flex items-center gap-1">
            Enviar <Icon.ArrowRight size={11}/>
          </button>
        )}
      </div>

      {multi && (
        <button onClick={confirmMulti} disabled={selected.length === 0 && !custom.trim()}
          className="h-9 px-4 rounded-lg bg-ink-900 text-paper text-[12.5px] font-medium hover:bg-ink-800 disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
          Continuar <Icon.ArrowRight size={12}/>
        </button>
      )}

      <div className="text-[10.5px] mono uppercase tracking-wider text-ink-400">
        pergunta {String(stepIdx+1).padStart(2,'0')} de {String(total).padStart(2,'0')}
      </div>
    </div>
  );
};

// ============ Generating animation ============
// Rendered inline in the chat as an agent message. Shows steps progressing.
const GeneratingCard = ({ steps, totalDuration = 30000, onDone, onSkip, embedded = false }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [substepIdx, setSubstepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const stepDuration = totalDuration / steps.length;

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      const newStep = Math.min(steps.length - 1, Math.floor(e / stepDuration));
      setStepIdx(newStep);
      if (e >= totalDuration) {
        clearInterval(tick);
        onDone && onDone();
      }
    }, 200);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    setSubstepIdx(0);
    const subs = steps[stepIdx]?.sub || [''];
    if (subs.length <= 1) return;
    const rot = setInterval(() => {
      setSubstepIdx(i => (i + 1) % subs.length);
    }, 2400);
    return () => clearInterval(rot);
  }, [stepIdx]);

  const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
  const current = steps[stepIdx];
  const sub = (current?.sub || [''])[substepIdx % (current?.sub?.length || 1)];

  return (
    <div className="bg-white border-half rounded-3xl shadow-lift p-6 relative overflow-hidden max-w-[640px]">
      <button onClick={onSkip} title="Ir para o roteiro"
        className="absolute top-4 right-4 h-8 px-3 rounded-md text-[12px] text-ink-500 hover:text-ink-900 hover:bg-ink-100 inline-flex items-center gap-1">
        Ir agora <Icon.ArrowRight size={11}/>
      </button>

      <div className="flex items-start gap-4">
        <div className="relative h-12 w-12 shrink-0">
          <div className="absolute inset-0 rounded-full bg-ink-900 text-paper flex items-center justify-center">
            <Icon.Logo size={20}/>
          </div>
          <div className="absolute inset-0 rounded-full ring-2 ring-ink-900/30 animate-ping"/>
        </div>
        <div className="flex-1 text-left">
          <div className="label">Gaid está montando seu roteiro</div>
          <div className="text-[19px] tracking-tight font-medium text-ink-900 mt-1">{current?.label}</div>
          <div className="text-[12.5px] text-ink-500 mt-1 transition-opacity duration-300" key={sub}>
            <span className="shimmer-text">{sub}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-1 rounded-full bg-ink-100 overflow-hidden">
          <div className="h-full bg-ink-900 transition-all duration-200" style={{ width: `${pct}%` }}/>
        </div>
        <div className="flex items-center justify-between text-[11px] mono text-ink-500 mt-1.5">
          <span>{pct}%</span>
          <span>{Math.max(0, Math.ceil((totalDuration - elapsed) / 1000))}s restantes</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-1.5 text-left">
        {steps.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <div key={s.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                          ${active ? 'bg-ink-50' : ''}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors
                              ${done ? 'bg-ink-900 text-paper' :
                                active ? 'bg-white border-half text-ink-900' :
                                'bg-ink-100 text-ink-400'}`}>
                {done ? <Icon.Check size={12}/> :
                 active ? <span className="h-1.5 w-1.5 rounded-full bg-ink-900 animate-pulse"/> :
                 <span className="h-1 w-1 rounded-full bg-ink-400"/>}
              </div>
              <div className={`text-[13px] flex-1 transition-colors
                              ${done ? 'text-ink-500 line-through decoration-ink-400' :
                                active ? 'text-ink-900 font-medium' :
                                'text-ink-400'}`}>
                {s.label}
              </div>
              {done && <div className="text-[10.5px] mono text-ink-400">ok</div>}
              {active && <div className="text-[10.5px] mono text-ink-700">…</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ Prep briefing — "Tudo que pensei por você" ============
// Rendered inline after generation when the trip has a prep checklist.
const PrepBriefing = ({ flowKey }) => {
  const trip = null;   // prep checklist comes from the generated trip (backend)
  const groups = (trip && trip.prep) || [];
  const [open, setOpen] = useState(0); // first group expanded
  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
  const doneItems = groups.reduce((s, g) => s + g.items.filter(i => i.done).length, 0);

  return (
    <div className="bg-white border-half rounded-3xl shadow-lift overflow-hidden max-w-[640px] fade-up">
      {/* header */}
      <div className="p-5 border-b hairline">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-ink-900 text-paper flex items-center justify-center"><Icon.Sparkles size={15}/></div>
          <div className="label">Concierge proativo</div>
        </div>
        <div className="text-[17px] font-medium tracking-tight text-ink-900 mt-3">{trip.prepTitle}</div>
        <div className="text-[13px] text-ink-600 mt-1 leading-relaxed">{trip.prepIntro}</div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full bg-ink-900" style={{ width: `${Math.round((doneItems/totalItems)*100)}%` }}/>
          </div>
          <div className="text-[11px] mono text-ink-500 shrink-0">{doneItems}/{totalItems} ok</div>
        </div>
      </div>

      {/* accordion groups */}
      <div className="divide-y hairline">
        {groups.map((g, gi) => {
          const Ic = Icon[g.icon] || Icon.Check;
          const expanded = open === gi;
          const gDone = g.items.filter(i => i.done).length;
          return (
            <div key={gi}>
              <button onClick={() => setOpen(expanded ? -1 : gi)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0
                                ${g.urgent ? 'bg-ink-900 text-paper' : 'bg-ink-100 text-ink-700'}`}>
                  <Ic size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-ink-900">{g.title}</span>
                    {g.urgent && <span className="text-[9.5px] font-medium px-1.5 h-4 rounded-full bg-coral-50 text-coral-700 flex items-center uppercase tracking-wide">prazo</span>}
                  </div>
                  <div className="text-[11.5px] text-ink-500 mt-0.5">{gDone}/{g.items.length} resolvidos</div>
                </div>
                <Icon.ChevronDown size={16} className={`text-ink-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}/>
              </button>
              {expanded && (
                <div className="px-5 pb-4 pt-1 space-y-2">
                  {g.items.map((it, ii) => (
                    <div key={ii} className="flex items-start gap-3">
                      <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5
                                      ${it.done ? 'bg-ink-900 text-paper' : 'border-half bg-white'}`}>
                        {it.done ? <Icon.Check size={11}/> : <span className="h-1 w-1 rounded-full bg-ink-400"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] leading-snug ${it.done ? 'text-ink-500' : 'text-ink-900 font-medium'}`}>{it.label}</div>
                        {it.note && <div className="text-[11.5px] text-ink-500 mt-0.5 leading-snug">{it.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 bg-ink-50/60 text-[11.5px] text-ink-500 flex items-center gap-2">
        <Icon.Info size={13}/> A Gaid monitora os prazos e te lembra na hora certa. Tudo isso fica salvo no roteiro.
      </div>
    </div>
  );
};

// ============ Trip-ready inline CTA ============
const TripReadyInline = ({ tripId, onOpen }) => {
  const trip = null;   // the created trip is read from the store once backend is wired
  if (!trip) return null;
  return (
    <button onClick={() => onOpen(tripId)}
      className="w-full max-w-[640px] bg-white border-half rounded-3xl overflow-hidden text-left card-h shadow-card fade-up">
      <div className="flex">
        <SmartImg src={trip.coverImage?.url} seed={trip.coverSeed} tone={trip.cover} w={280} h={280} className="w-[120px] shrink-0"/>
        <div className="flex-1 p-4 min-w-0">
          <div className="label">Roteiro pronto</div>
          <div className="text-[16px] font-medium tracking-tight text-ink-900 mt-1 leading-tight truncate">{trip.title}</div>
          <div className="text-[12px] text-ink-500 mt-1">{trip.dates} · {trip.nights} noites · {trip.budget}</div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900">
            Abrir roteiro completo <Icon.ArrowRight size={13}/>
          </div>
        </div>
      </div>
    </button>
  );
};

// First-run replacement for the "continue where you left off" block, shown when
// the account has no active trip yet. Welcomes the user and points them at the
// two ways to start: describe a trip (prompt above) or browse inspiration.
const HomeFirstRun = ({ acct, setRoute, onPickIdea }) => {
  const traits = deriveTraits(acct.profile);
  const styleChips = (acct.profile?.travelStyles || []).slice(0, 3);
  const completion = profileCompletion(acct.profile);
  // Action starters — each routes to a real screen, so they keep working once
  // the backend is plugged in (no fabricated content, just navigation/intent).
  const starters = [
    { id: 'custom',  label: 'Criar roteiro personalizado', icon: Icon.Sparkles, primary: true, run: () => setRoute('plan') },
    { id: 'search',  label: 'Buscar voos ou hospedagens',  icon: Icon.Search,   run: () => setRoute('flights') },
    { id: 'explore', label: 'Explorar roteiros prontos',    icon: Icon.Compass,  run: () => setRoute('explore') },
  ];

  return (
    <section className="px-10 pb-12 -mt-5">
      <div className="flex flex-wrap justify-center gap-1">
        {starters.map(s => {
          const Ic = s.icon;
          return (
            <button key={s.id} onClick={s.run}
              className="h-8 px-3.5 rounded-full bg-ink-100 text-[12px] font-medium text-ink-700 hover:bg-ink-200 hover:text-ink-900 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap">
              <Ic size={12} className="text-ink-500"/> {s.label}
            </button>
          );
        })}
      </div>
    </section>
  );
};

const SetupRow = ({ icon: Ic, label, hint, done, onClick }) => (
  <button onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-ink-50 transition-colors text-left">
    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-ink-900 text-paper' : 'bg-ink-100 text-ink-700'}`}>
      {done ? <Icon.Check size={15}/> : <Ic size={15}/>}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-medium text-ink-900">{label}</div>
      <div className="text-[11.5px] text-ink-500">{hint}</div>
    </div>
    <Icon.ChevronRight size={15} className="text-ink-400 shrink-0"/>
  </button>
);

const Row = ({ icon: Ic, label, value, hint, tone }) => (
  <div className="flex items-center gap-3">
    <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center"><Ic size={15}/></div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px] text-ink-500">{label}</div>
      <div className="text-[14px] font-medium text-ink-900">{value}</div>
    </div>
    <div className={`text-[11.5px] ${tone === 'sage' ? 'text-sage-700' : 'text-ink-500'}`}>{hint}</div>
  </div>
);

// ---------- Starters board: full-width carousel, editable + draggable ----------
const tones = ['warm','cool','sage','coral','ink'];
const StartersBoard = ({ onPick }) => {
  const [items, setItems] = useState(() => ([
    { id: 'descanso', label: 'Uns dias de descanso', hint: 'ritmo lento',   tone: 'warm' },
    { id: 'familia',  label: 'Viagem em família',    hint: 'com crianças',  tone: 'cool' },
    { id: 'cidade',   label: 'Cidade + gastronomia', hint: 'fim de semana', tone: 'sage' },
    { id: 'lua',      label: 'Lua de mel',           hint: 'a dois',        tone: 'coral' },
  ]));
  const [editing, setEditing] = useState(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftHint, setDraftHint] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const scrollerRef = useRef(null);

  const startEdit = (it) => {
    setEditing(it.id);
    setDraftLabel(it.label);
    setDraftHint(it.hint);
  };
  const commitEdit = () => {
    if (!editing) return;
    setItems(xs => xs.map(x => x.id === editing ? { ...x, label: draftLabel || x.label, hint: draftHint || x.hint } : x));
    setEditing(null);
  };
  const remove = (id) => setItems(xs => xs.filter(x => x.id !== id));
  const add = () => {
    const id = 'new-' + Date.now();
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const it = { id, label: 'Nova ideia', hint: 'descrever…', tone };
    setItems(xs => [...xs, it]);
    setTimeout(() => {
      startEdit(it);
      scrollerRef.current?.scrollTo({ left: 999999, behavior: 'smooth' });
    }, 30);
  };

  const onDragStart = (id) => (e) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch {}
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== overId) setOverId(id);
  };
  const onDrop = (id) => (e) => {
    e.preventDefault();
    if (!dragId || dragId === id) { setDragId(null); setOverId(null); return; }
    setItems(xs => {
      const a = xs.findIndex(x => x.id === dragId);
      const b = xs.findIndex(x => x.id === id);
      if (a < 0 || b < 0) return xs;
      const copy = xs.slice();
      const [moved] = copy.splice(a, 1);
      copy.splice(b, 0, moved);
      return copy;
    });
    setDragId(null);
    setOverId(null);
  };
  const onDragEnd = () => { setDragId(null); setOverId(null); };

  const scrollBy = (px) => scrollerRef.current?.scrollBy({ left: px, behavior: 'smooth' });

  return (
    <section className="mt-12 px-10 pb-2">
      <div className="flex items-end justify-between mb-5 max-w-[1400px] mx-auto">
        <div>
          <div className="label">Comece por uma ideia</div>
          <div className="text-[22px] tracking-tight font-medium text-ink-900 mt-1.5">Suas pistas favoritas</div>
          <div className="text-[12.5px] text-ink-500 mt-1">Clique para editar · arraste para reordenar · monte como faz sentido pra você</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scrollBy(-340)} title="Anterior"
            className="h-9 w-9 rounded-full border-half bg-white text-ink-700 hover:text-ink-900 hover:bg-ink-100 flex items-center justify-center transition-colors">
            <Icon.ChevronLeft size={15}/>
          </button>
          <button onClick={() => scrollBy(340)} title="Próximo"
            className="h-9 w-9 rounded-full border-half bg-white text-ink-700 hover:text-ink-900 hover:bg-ink-100 flex items-center justify-center transition-colors">
            <Icon.ChevronRight size={15}/>
          </button>
          <button onClick={add}
            className="h-9 px-3 rounded-full border-half bg-white text-[12.5px] font-medium text-ink-900 hover:bg-ink-100 transition-colors inline-flex items-center gap-1.5 ml-1">
            <Icon.Plus size={13}/> Adicionar
          </button>
        </div>
      </div>

      <div className="relative -mx-10">
        <div className="absolute left-0 top-0 bottom-3 w-10 bg-gradient-to-r from-canvas to-transparent pointer-events-none z-10"/>
        <div className="absolute right-0 top-0 bottom-3 w-10 bg-gradient-to-l from-canvas to-transparent pointer-events-none z-10"/>
        <div ref={scrollerRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-10 px-10 pb-3 no-scrollbar">
          {items.map((s) => {
            const isDragging = dragId === s.id;
            const isOver = overId === s.id && dragId && dragId !== s.id;
            const isEditing = editing === s.id;
            return (
              <div key={s.id}
                draggable={!isEditing}
                onDragStart={onDragStart(s.id)}
                onDragOver={onDragOver(s.id)}
                onDrop={onDrop(s.id)}
                onDragEnd={onDragEnd}
                className={`group relative bg-white border-half rounded-2xl text-left overflow-hidden transition-all shrink-0 snap-start w-[260px]
                            ${isDragging ? 'opacity-40 scale-[.98]' : ''}
                            ${isOver ? 'ring-2 ring-ink-900 ring-offset-2 ring-offset-canvas' : 'hover:border-ink-400 hover:shadow-card'}
                            ${isEditing ? 'shadow-lift ring-1 ring-ink-900' : ''}`}>
                <SmartImg seed={`starter-${s.id}-${s.label.slice(0,10)}`} tone={s.tone} w={500} h={400} className="h-[170px] w-full"/>

                {!isEditing && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onMouseDown={(e)=>e.stopPropagation()} title="Arraste para reordenar"
                      className="h-7 w-7 rounded-md bg-white/95 border-half text-ink-700 hover:text-ink-900 flex items-center justify-center cursor-grab active:cursor-grabbing">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(s); }} title="Editar"
                      className="h-7 w-7 rounded-md bg-white/95 border-half text-ink-700 hover:text-ink-900 flex items-center justify-center">
                      <Icon.Edit size={12}/>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); remove(s.id); }} title="Remover"
                      className="h-7 w-7 rounded-md bg-white/95 border-half text-ink-700 hover:text-ink-900 flex items-center justify-center">
                      <Icon.Trash size={12}/>
                    </button>
                  </div>
                )}

                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input autoFocus
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                        className="w-full h-9 px-2 rounded-md border-half text-[14px] font-medium text-ink-900 bg-white"
                        placeholder="Como você descreveria?"/>
                      <input
                        value={draftHint}
                        onChange={(e) => setDraftHint(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                        className="w-full h-8 px-2 rounded-md border-half text-[12px] text-ink-700 bg-white"
                        placeholder="duração, vibe, ritmo…"/>
                      <div className="flex items-center justify-between pt-1">
                        <button onClick={() => setEditing(null)} className="text-[11.5px] text-ink-500 hover:text-ink-900">Cancelar</button>
                        <button onClick={commitEdit} className="text-[11.5px] font-medium text-ink-900 hover:underline">Salvar ↵</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => onPick(s.label)} className="w-full text-left">
                      <div className="text-[15px] font-medium text-ink-900 leading-tight">{s.label}</div>
                      <div className="text-[12px] text-ink-500 mt-1">{s.hint}</div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button onClick={add}
            className="border-half border-dashed rounded-2xl text-ink-500 hover:text-ink-900 hover:bg-ink-100/60 transition-colors flex flex-col items-center justify-center gap-2 shrink-0 snap-start w-[260px]">
            <div className="h-10 w-10 rounded-full bg-white border-half flex items-center justify-center"><Icon.Plus size={16}/></div>
            <div className="text-[13px] font-medium">Nova ideia</div>
            <div className="text-[10.5px] mono uppercase tracking-wider">arraste · edite · use</div>
          </button>
        </div>
      </div>
    </section>
  );
};


export { HomeScreen };
