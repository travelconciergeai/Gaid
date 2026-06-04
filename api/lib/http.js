export function json(res, status, body) {
  res.status(status).json(body);
}

export function methodNotAllowed(res, allowed = ['POST']) {
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { error: 'Método não permitido.' });
}

export function badRequest(res, message) {
  return json(res, 400, { error: message });
}

export function serverError(res, message, detail) {
  console.error('[api]', message, detail || '');
  return json(res, 500, { error: message, detail: detail || undefined });
}

export function serviceUnavailable(res, message) {
  return json(res, 503, { error: message });
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}

export function pickString(obj, key, fallback = '') {
  const v = obj?.[key];
  return typeof v === 'string' ? v.trim() : fallback;
}

export function pickNumber(obj, key, fallback = null) {
  const v = Number(obj?.[key]);
  return Number.isFinite(v) ? v : fallback;
}

export function toneFromSeed(seed = '') {
  const tones = ['warm', 'cool', 'sage', 'coral', 'ink'];
  const hash = [...String(seed)].reduce((h, c) => ((h * 31) + c.charCodeAt(0)) >>> 0, 7);
  return tones[hash % tones.length];
}

export function formatDurationMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function formatStops(count) {
  if (count === 0) return 'Direto';
  if (count === 1) return '1 escala';
  return `${count} escalas`;
}

export function formatPriceBRL(amount, currency = 'BRL') {
  if (!Number.isFinite(amount)) return null;
  if (currency === 'BRL') {
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `${currency} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function isoDateOnly(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return isoDateOnly(d);
}

export function defaultDepartDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return isoDateOnly(d);
}

export function defaultReturnDate(depart) {
  return addDays(depart || defaultDepartDate(), 7);
}
