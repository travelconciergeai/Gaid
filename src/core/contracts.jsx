// ============================================================================
// Gaid Production — CONTRACTS & HELPERS
// ----------------------------------------------------------------------------
// The canonical vocabulary the whole frontend consumes. Declarative only.
// These are the shapes the backend will return (see docs 01/03/10). Components
// never invent any of these values — when a field is missing we render the
// approved empty state or the "A definir" placeholder.
//
//   TravelProfile · Trip · TripDay · TripEvent · TripTemplate
//   Hotel · Flight · Tour · Expert · Plan · Starter
//
// NOTE: React hooks are referenced as React.useX in core/* to avoid colliding
// with the `const { useState, ... } = React` already declared in ui.jsx.
// ============================================================================

// The placeholder for any value the backend hasn't provided yet. NEVER faked.
const TBD = 'A definir';

// True only for values that actually carry data.
const has = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
};
const orTBD = (v, placeholder = TBD) => (has(v) ? v : placeholder);

// ---- Canonical enums ----
// TripStatus → UI label (the exact strings the approved screens expect).
const TRIP_STATUS_LABEL = {
  active:    'Roteiro vivo',
  planning:  'Em planejamento',
  idea:      'Idéia',
  completed: 'Concluído',
  // draft / archived are hidden from "Minhas viagens"
};
const TRIP_VISIBLE = new Set(['active', 'planning', 'idea', 'completed']);

// ---- Formatters: keep the EXACT string format the approved UI renders ----
// Backend may send structured values; these reproduce today's strings so the
// presentation never changes. When the value is absent → "A definir".
const MONTHS_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtMoney(m) {
  if (!has(m)) return TBD;
  if (typeof m === 'string') return m;                 // already formatted
  const cur = m.currency || 'R$';
  if (has(m.amount)) return `${cur} ${Number(m.amount).toLocaleString('pt-BR')}`;
  if (has(m.min) && has(m.max)) return `${cur} ${(m.min/1000)}–${(m.max/1000)}k`;
  return TBD;
}
function fmtDateRangeShort(dates) {       // "12–22 out · 2026"
  if (!has(dates) || !has(dates.start)) return TBD;
  const a = new Date(dates.start), b = dates.end ? new Date(dates.end) : null;
  if (isNaN(a)) return TBD;
  const mon = MONTHS_PT[a.getMonth()];
  const yr = a.getFullYear();
  if (b && !isNaN(b)) return `${a.getDate()}–${b.getDate()} ${mon} · ${yr}`;
  return `${a.getDate()} ${mon} · ${yr}`;
}
function fmtDuration(min) {
  if (!has(min)) return TBD;
  if (typeof min === 'string') return min;
  return min >= 60 ? `${Math.round(min/60)} h` : `${min} min`;
}


export { TBD, has, orTBD, TRIP_STATUS_LABEL, TRIP_VISIBLE, fmtMoney, fmtDateRangeShort, fmtDuration };
