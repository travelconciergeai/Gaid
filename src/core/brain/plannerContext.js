import { normText } from './intentRouter.js';

const GENERIC_PROMPT_PATTERNS = [
  /^ola\b/,
  /^oi\b/,
  /^quero viajar$/,
  /^quero uma viagem$/,
  /^quero ir$/,
  /^quero montar (um )?roteiro$/,
  /^quero criar (um )?roteiro$/,
  /^quero montar uma viagem$/,
  /^quero criar uma viagem$/,
  /^planejar viagem$/,
  /^criar roteiro$/,
  /^montar roteiro$/,
  /^me ajuda/,
  /^nao sei/,
  /^ainda nao sei/,
];

const PLANNER_PHRASE_PATTERNS = /\b(roteiro|viagem|viajar|planej|planejar|monte|montar|criar|crie)\b/i;

export function isGenericPlannerPrompt(value) {
  const text = normText(value).trim();
  if (!text) return true;
  return GENERIC_PROMPT_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeDestination(value) {
  const raw = String(value || '').trim();
  if (!raw || isGenericPlannerPrompt(raw)) return '';
  const candidate = raw
    .replace(/\b(?:para|pra|em|no|na)\s+(?:a|o|os|as)?\s*/i, '')
    .replace(/\b(?:em|no|na|de|do|da)?\s*(?:janeiro|jan|fevereiro|fev|mar[cç]o|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\b.*$/i, '')
    .replace(/\b(?:por|durante|com)\s+(?:minha|meu|ma|me).*/i, '')
    .replace(/\b(?:por|durante)\s+\d+.*$/i, '')
    .replace(/[,.!?;:].*$/, '')
    .trim();
  if (!candidate || candidate.length < 2) return '';
  if (isGenericPlannerPrompt(candidate) || PLANNER_PHRASE_PATTERNS.test(candidate)) return '';
  return candidate;
}

const PT_MONTHS = {
  janeiro: 1, jan: 1, fevereiro: 2, fev: 2, marco: 3, mar: 3, abril: 4, abr: 4,
  maio: 5, mai: 5, junho: 6, jun: 6, julho: 7, jul: 7, agosto: 8, ago: 8,
  setembro: 9, set: 9, outubro: 10, out: 10, novembro: 11, nov: 11, dezembro: 12, dez: 12,
};

function isoDate(year, month, day) {
  if (!year || !month || !day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDateRange(value) {
  const label = String(value || '').trim();
  if (!label) return null;
  const numeric = label.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:a|ate|até|-)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i);
  if (numeric) {
    const startYear = Number(numeric[3]?.length === 2 ? `20${numeric[3]}` : numeric[3]) || new Date().getFullYear();
    const endYear = Number((numeric[6] || numeric[3])?.length === 2 ? `20${numeric[6] || numeric[3]}` : (numeric[6] || numeric[3])) || startYear;
    return {
      label,
      start: isoDate(startYear, Number(numeric[2]), Number(numeric[1])),
      end: isoDate(endYear, Number(numeric[5]), Number(numeric[4])),
    };
  }
  const text = normText(label);
  const monthName = Object.keys(PT_MONTHS).find((month) => text.includes(month));
  const year = Number(text.match(/\b(20\d{2})\b/)?.[1]) || new Date().getFullYear();
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1])).filter((d) => d >= 1 && d <= 31);
  if (monthName && days.length >= 2) {
    return {
      label,
      start: isoDate(year, PT_MONTHS[monthName], days[0]),
      end: isoDate(year, PT_MONTHS[monthName], days[1]),
    };
  }
  return { label };
}

export function extractPeriodLabel(value) {
  const text = normText(value);
  const monthName = Object.keys(PT_MONTHS).find((month) => text.includes(month));
  if (monthName) return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const season = text.match(/\b(verao|verão|inverno|primavera|outono|ferias|férias|fim de ano|carnaval|reveillon|réveillon)\b/)?.[1];
  return season ? season.charAt(0).toUpperCase() + season.slice(1) : '';
}

export function parseTravelerComposition(value) {
  const text = normText(value);
  if (/\b(casal|esposa|marido|esposo|namorad[ao]|companheir[ao]|a dois|eu e minha|eu e meu|com minha|com meu)\b/.test(text)) {
    return { count: 2, adults: 2, children: null, ages: [], composition: 'Casal' };
  }
  if (/\b(so eu|só eu|sozinh[ao]|solo)\b/.test(text)) {
    return { count: 1, adults: 1, children: null, ages: [], composition: 'Solo' };
  }
  if (/\b(famil|crianc|filh|filha|filho)\b/.test(text)) {
    const adults = Number(text.match(/(\d+)\s*adult/)?.[1]) || 2;
    const childrenCount = Number(text.match(/(\d+)\s*(crianc|filh)/)?.[1]) || 1;
    const ageSection = text.match(/(?:criancas?|filhos?).*?(?:de|com)?\s*((?:\d+\s*(?:,|e|\+)?\s*)+)/)?.[1] || '';
    const ages = [...ageSection.matchAll(/\d+/g)].map((m) => Number(m[0])).filter((a) => a >= 0 && a <= 17);
    const count = (adults || 0) + (childrenCount || ages.length || 1);
    return { count, adults, children: childrenCount || ages.length, ages, composition: 'Família' };
  }
  if (/\b(amig|grupo)\b/.test(text)) {
    const count = Number(text.match(/(\d+)\s*(pessoas|viajantes|amigos)/)?.[1]) || 3;
    return { count, adults: count, children: null, ages: [], composition: 'Amigos' };
  }
  const adults = Number(text.match(/(\d+)\s*adult/)?.[1]) || null;
  const childrenCount = Number(text.match(/(\d+)\s*(crianc|filh)/)?.[1]) || null;
  const total = adults || childrenCount ? (adults || 0) + (childrenCount || 0) : null;
  return {
    count: total,
    adults,
    children: childrenCount,
    ages: [],
    composition: total ? null : null,
  };
}

export function parseDurationFromText(value) {
  const text = normText(value);
  const nightsMatch = text.match(/(\d+)\s*noites?/);
  if (nightsMatch) {
    const nights = Number(nightsMatch[1]);
    return { nights, durationDays: nights + 1, label: `${nights} noites` };
  }
  const daysMatch = text.match(/(\d+)\s*dias?/);
  if (daysMatch) {
    const durationDays = Number(daysMatch[1]);
    return { nights: Math.max(durationDays - 1, 1), durationDays, label: `${durationDays} dias` };
  }
  return null;
}

export function inclusiveDurationFromDates(dates) {
  if (!dates?.start || !dates?.end) return null;
  const start = new Date(`${dates.start}T00:00:00`);
  const end = new Date(`${dates.end}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (nights <= 0) return null;
  return { nights, durationDays: nights + 1 };
}

export function extractPlannerContextFromMessage(value, seed = {}) {
  const raw = String(value || '').trim();
  const destination = sanitizeDestination(
    raw.match(/\b(?:para|pra|em|no|na|ir para|viajar para|quero ir para)\s+(?:a|o|os|as)?\s*([\wÀ-ÿ' -]{2,80})/i)?.[1] || raw
  );
  const period = extractPeriodLabel(raw);
  const promptDates = parseDateRange(raw);
  const duration = parseDurationFromText(raw);
  const travelers = parseTravelerComposition(raw);
  const dates = promptDates?.start && promptDates?.end
    ? { ...promptDates, label: period || promptDates.label }
    : period ? { label: period } : null;
  const dateDuration = inclusiveDurationFromDates(dates);

  return {
    ...(seed && typeof seed === 'object' && !Array.isArray(seed) ? seed : {}),
    ...(destination ? { destination } : {}),
    ...(period ? { period } : {}),
    ...(dates ? { dates } : {}),
    ...(duration?.nights ? { nights: duration.nights, durationDays: duration.durationDays, duration: duration.label } : {}),
    ...(dateDuration ? { nights: dateDuration.nights, durationDays: dateDuration.durationDays } : {}),
    ...(travelers.count ? {
      travelers: {
        count: travelers.count,
        composition: travelers.composition,
        adults: travelers.adults,
        children: { count: travelers.children, ages: travelers.ages },
      },
      travelerComposition: travelers.composition,
    } : {}),
  };
}

export function plannerCompletionStatus(answers = {}, context = {}) {
  const destination = sanitizeDestination(
    [answers.destination?.label, context.destination].filter(Boolean).join(' ')
  );
  const destinationKnown = !!destination;
  const dates = context.dates;
  const durationFromContext = context.durationDays || (context.nights != null ? context.nights + 1 : null);
  const durationFromAnswers = parseDurationFromText(answers.duration?.label);
  const durationKnown = !!(durationFromContext || durationFromAnswers?.durationDays || inclusiveDurationFromDates(dates)?.durationDays);
  const travelers = parseTravelerComposition(
    `${answers.travelers?.label || ''} ${answers.travelerCount?.label || ''} ${context.travelerComposition || ''} ${context.travelers?.count || ''}`
  );
  const travelersKnown = !!(travelers.count && travelers.composition) ||
    !!(context.travelers?.count && context.travelers?.composition);
  const styleKnown = !!(
    answers.stylePace?.label ||
    answers.priorities?.label ||
    answers.tripPriority?.label ||
    context.stylePace ||
    (Array.isArray(context.priorities) && context.priorities.length > 0)
  );
  const explicitAssumptionMode = context.skippedAll === true || context.wizard?.skippedAll === true;

  return {
    destinationKnown,
    durationKnown,
    travelersKnown,
    styleKnown,
    explicitAssumptionMode,
    ready: destinationKnown && durationKnown && (travelersKnown || explicitAssumptionMode) && !context.assumptionsBlocked,
    destination,
  };
}

export function requiredPlannerField(answers, context) {
  const status = plannerCompletionStatus(answers, context);
  if (!status.destinationKnown) return 'destination';
  if (!status.durationKnown && !status.explicitAssumptionMode) return 'duration';
  if (!status.travelersKnown && !status.explicitAssumptionMode) return 'travelers';
  if (!status.styleKnown && !status.explicitAssumptionMode) return 'stylePace';
  return null;
}
