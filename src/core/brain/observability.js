const BRAIN_LOG_PREFIX = 'Gaid Brain';
const SENSITIVE_KEY_PATTERN = /(key|token|secret|password|email|phone|cpf|authorization|auth)/i;
const MAX_STRING_LENGTH = 180;
const MAX_ARRAY_LENGTH = 8;
const MAX_DEPTH = 4;

function isDevRuntime() {
  return Boolean(import.meta?.env?.DEV);
}

function timestamp() {
  return new Date().toISOString();
}

function sanitize(value, depth = 0) {
  if (depth > MAX_DEPTH) return '[depth-limit]';
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map(item => sanitize(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
        .map(([key, item]) => [key, sanitize(item, depth + 1)])
    );
  }
  return String(value);
}

export function logBrainEvent(eventName, payload = {}) {
  if (!isDevRuntime()) return;
  const event = {
    eventName,
    timestamp: timestamp(),
    ...sanitize(payload),
  };
  const title = `${BRAIN_LOG_PREFIX} · ${eventName}`;
  if (typeof console.groupCollapsed === 'function') {
    console.groupCollapsed(title);
    console.log(event);
    console.groupEnd();
  } else {
    console.log(title, event);
  }
}

export function logIntentDecision(payload = {}) {
  logBrainEvent('intent_decision', payload);
}

export function logKnowledgeDecision(payload = {}) {
  logBrainEvent('knowledge_decision', payload);
}

export function logToolExecution(payload = {}) {
  logBrainEvent('tool_execution', payload);
}

export function logBrainError(payload = {}) {
  if (!isDevRuntime()) return;
  const error = payload?.error;
  logBrainEvent('brain_error', {
    ...payload,
    error: error
      ? {
        name: error.name,
        message: error.message || String(error),
      }
      : null,
  });
}
