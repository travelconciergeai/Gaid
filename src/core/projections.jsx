import { TBD, has, orTBD, TRIP_STATUS_LABEL, fmtMoney } from './contracts.jsx';
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
  if (!trip) return null;
  return {
    id: trip.id,
    title: orTBD(trip.title),
    dates: fmtDateRangeShort(trip.dates),
    state: TRIP_STATUS_LABEL[trip.status] || 'Em planejamento',
    _status: trip.status,                       // raw, for filtering
    travelers: has(trip.travelers) ? trip.travelers : 0,
    tone: trip.cover || 'warm',
    cover: trip.coverShort || (trip.cities && trip.cities[0]) || trip.title || '',
    progress: has(trip.progress) ? trip.progress : 0,
    hasItinerary: has(trip.days),
  };
}

// Trip (canônica) → TripDetail (PlanScreen).
// Shape consumed today: { id, title, blurb, dates, nights, travelers, budget,
//   status, cover, coverSeed, coverLabel, progress, days[], insights[] }
function toTripDetail(trip) {
  if (!trip) return null;
  const days = Array.isArray(trip.days)
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
  const insights = Array.isArray(trip.insights)
    ? trip.insights.filter(it => it && typeof it === 'object' && !Array.isArray(it))
    : [];
  return {
    id: trip.id,
    title: orTBD(trip.title),
    destination: trip.destination || trip.tripContext?.destination || '',
    blurb: trip.blurb || '',
    dates: has(trip.dates) ? fmtDateLong(trip.dates) : TBD,
    nights: has(trip.nights) ? trip.nights : null,
    travelers: has(trip.travelers) ? trip.travelers : 0,
    budget: fmtMoney(trip.budget),
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
