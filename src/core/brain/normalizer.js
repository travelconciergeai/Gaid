function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeUserMessage(text) {
  const originalText = normalizeSpaces(text);
  const normalized = originalText.toLowerCase();
  const normalizedNoAccent = stripAccents(normalized);
  const tokens = normalizedNoAccent.split(/[^a-z0-9]+/i).filter(Boolean);
  return {
    originalText,
    normalized,
    normalizedNoAccent,
    tokens,
  };
}

export { normalizeUserMessage, normalizeSpaces, stripAccents };
