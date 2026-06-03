import { TBD, has, orTBD, TRIP_STATUS_LABEL, fmtMoney, fmtDateRangeShort } from './contracts.jsx';
// ============================================================================
// Gaid Production — PROJECTIONS (view-models)
// ----------------------------------------------------------------------------
// Map the canonical Trip → the exact shapes the approved screens consume
// (per the Phase 0 inventory). This is the layer that guarantees visual
// parity: the UI never changes, it just receives these.
// ============================================================================

// Trip (canônica) → TripSummary (card de Minhas Viagens / Home).
// Shape consumed today: { id, title, dates, state, travelers, tone, cover, progress }
function toTripSummary(trip) {
  if (!trip || typeof trip !== 'object' || Array.isArray(trip)) return null;
  const tripContext = trip.tripContext && typeof trip.tripContext === 'object' && !Array.isArray(trip.tripContext) ? trip.tripContext : {};
  const destination = trip.destination || tripContext.destination || '';
  const dates = trip.dates || tripContext.dates || null;
  const status = trip.status || 'planning';
  return {
    id: trip.id || '',
    title: orTBD(trip.title || (destination ? `Viagem para ${destination}` : '')),
    dates: fmtSummaryDates(dates),
    state: TRIP_STATUS_LABEL[status] || 'Em planejamento',
    _status: status,                       // raw, for filtering
    travelers: tripTravelerCount(trip),
    tone: trip.cover || 'warm',
    cover: trip.coverShort || destination || (Array.isArray(trip.cities) && trip.cities[0]) || trip.title || '',
    progress: has(trip.progress) ? trip.progress : 0,
    hasItinerary: Array.isArray(trip.days) && trip.days.length > 0,
  };
}

// Trip (canônica) → TripDetail (PlanScreen).
// Shape consumed today: { id, title, blurb, dates, nights, travelers, budget,
//   status, cover, coverSeed, coverLabel, progress, days[], insights[] }
function toTripDetail(trip) {
  if (!trip) return null;
  const validDays = Array.isArray(trip.days)
    ? trip.days
      .filter(d => d && typeof d === 'object' && !Array.isArray(d))
      .map((d, idx) => ({
        d: d.d ?? idx + 1,
        date: d.date || TBD,
        city: d.city || TBD,
        flight: d.flight || null,
        items: Array.isArray(d.items)
          ? d.items
            .filter(it => it && typeof it === 'object' && !Array.isArray(it))
            .map(it => ({
              t: SLOT_PT[it.slot] || it.t || 'item',
              title: it.title || TBD,
              place: it.place || TBD,
              dur: it.dur || TBD,
              tag: it.tag || 'item',
              vibe: it.vibe || '',
              conf: !!it.conf,
            }))
          : [],
      }))
    : [];
  const destination = trip.destination || trip.tripContext?.destination || '';
  const dates = trip.dates || trip.tripContext?.dates || null;
  const days = validDays.length > 0
    ? validDays
    : buildPlaceholderDays({
      count: inferPlaceholderDayCount(trip, dates),
      dates,
      city: destination || TBD,
    });
  const insights = Array.isArray(trip.insights)
    ? trip.insights.filter(it => it && typeof it === 'object' && !Array.isArray(it))
    : [];
  return {
    id: trip.id,
    title: orTBD(trip.title),
    destination,
    blurb: trip.blurb || '',
    dates: fmtTripDates(dates),
    nights: tripNights(trip, dates),
    travelers: tripTravelerCount(trip),
    budget: fmtTripBudget(trip.budget),
    status: TRIP_STATUS_LABEL[trip.status] || 'Em planejamento',
    cover: trip.cover || 'warm',
    coverSeed: trip.coverSeed || `trip-${trip.id}`,
    coverLabel: trip.coverLabel || (trip.cities && trip.cities[0]) || '',
    progress: has(trip.progress) ? trip.progress : 0,
    expert: trip.expertName || null,
    tripContext: trip.tripContext || {},
    metadata: trip.metadata || {},
    days,
    insights,
  };
}

const SLOT_PT = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };
function numericCount(value) {
  if (typeof value === 'number') return value > 0 ? value : null;
  if (typeof value === 'string') {
    const count = Number(value.match(/\d+/)?.[0]);
    return Number.isFinite(count) && count > 0 ? count : null;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const count = Number(value.count);
    return Number.isFinite(count) && count > 0 ? count : null;
  }
  return null;
}

function tripTravelerCount(trip) {
  const tripContext = trip?.tripContext && typeof trip.tripContext === 'object' && !Array.isArray(trip.tripContext) ? trip.tripContext : {};
  return numericCount(tripContext.travelers) ?? numericCount(tripContext.travelerCount) ?? numericCount(trip?.travelers) ?? TBD;
}

function tripNights(trip, dates) {
  const nights = Number(trip?.nights ?? trip?.tripContext?.nights);
  if (Number.isFinite(nights) && nights > 0) return Math.floor(nights);
  return dateDiffDays(dates);
}

function inferPlaceholderDayCount(trip, dates) {
  const nights = Number(tripNights(trip, dates));
  if (Number.isFinite(nights) && nights > 0) return Math.min(Math.floor(nights), 30);
  return 3;
}

function dateDiffDays(dates) {
  const start = dates?.start ? new Date(dates.start) : null;
  const end = dates?.end ? new Date(dates.end) : null;
  if (start && end && !isNaN(start) && !isNaN(end) && end >= start) {
    const diffDays = Math.round((end - start) / 86400000);
    if (diffDays > 0) return Math.min(diffDays, 30);
  }
  return null;
}

function buildPlaceholderDays({ count, dates, city }) {
  const start = dates?.start ? new Date(dates.start) : null;
  const hasStart = start && !isNaN(start);
  return Array.from({ length: count }, (_, idx) => ({
    d: idx + 1,
    date: hasStart ? fmtDayDate(addDays(start, idx)) : TBD,
    city: city || TBD,
    flight: false,
    items: [],
  }));
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function fmtDayDate(date) {
  if (!date || isNaN(date)) return TBD;
  const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function fmtTripDates(dates) {
  if (has(dates?.start)) return fmtDateLong(dates);
  if (has(dates?.label)) return dates.label;
  return TBD;
}

function fmtSummaryDates(dates) {
  if (has(dates?.start)) return fmtDateRangeShort(dates);
  if (has(dates?.label)) return dates.label;
  return TBD;
}

function fmtTripBudget(budget) {
  if (budget && typeof budget === 'object' && !Array.isArray(budget) && has(budget.label)) return budget.label;
  return fmtMoney(budget);
}

function fmtDateLong(dates) {            // "12–22 outubro"
  if (!has(dates) || !has(dates.start)) return TBD;
  const MONTHS_LONG = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const a = new Date(dates.start), b = dates.end ? new Date(dates.end) : null;
  if (isNaN(a)) return TBD;
  const mon = MONTHS_LONG[a.getMonth()];
  if (b && !isNaN(b) && b.getMonth() === a.getMonth()) return `${a.getDate()}–${b.getDate()} ${mon}`;
  if (b && !isNaN(b)) return `${a.getDate()} ${MONTHS_LONG[a.getMonth()]} – ${b.getDate()} ${MONTHS_LONG[b.getMonth()]}`;
  return `${a.getDate()} ${mon}`;
}


export { toTripSummary, toTripDetail };
