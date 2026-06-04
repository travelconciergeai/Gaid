export function logGaidEvent(name, payload = {}) {
  if (typeof console === 'undefined' || !console.info) return;
  console.info(`[gaid:${name}]`, {
    at: new Date().toISOString(),
    ...payload,
  });
}
