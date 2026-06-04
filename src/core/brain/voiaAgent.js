/**
 * Voia Agent — client-side orchestration for the agentic copilot.
 * Routes complex requests through /api/agent with tool calling.
 */

import { tripApi } from '../tripApi.jsx';

export const VOIA_AGENT_CAPABILITIES = [
  'planejar roteiro',
  'buscar voos',
  'buscar hotéis',
  'buscar passeios',
  'consultar experts',
  'editar itinerário',
  'modo viagem',
];

/**
 * Send a message to the Voia agent (with tool calling).
 * Falls back to regular chat if agent fails.
 */
export async function sendVoiaMessage({ message, history = [], context = {} } = {}) {
  try {
    return await tripApi.sendChatMessage({ message, history, context, useAgent: true });
  } catch (_error) {
    return tripApi.sendChatMessage({ message, history, context, useAgent: false });
  }
}

/**
 * Query the Voia brain directly (expert knowledge).
 */
export async function queryVoiaBrain({ query, destination, category, limit = 8 } = {}) {
  return tripApi.queryBrain({ query, destination, category, limit });
}

/**
 * Determine if a message should use the full agent (tool calling).
 */
export function shouldUseAgent(message = '') {
  const text = String(message).toLowerCase();
  const agentPatterns = [
    /\b(voo|voos|passagem|a[eé]reo)\b/,
    /\b(hotel|hot[eé]is|hospedagem|pousada)\b/,
    /\b(passeio|tour|experi[eê]ncia|atividade)\b/,
    /\b(busca|buscar|encontra|achar|comparar)\b/,
    /\b(chuva|imprevisto|cancelou|atrasou|alternativa)\b/,
    /\b(milhas|or[cç]amento|budget)\b/,
    /\b(expert|curadoria|dica de expert)\b/,
  ];
  return agentPatterns.some(re => re.test(text));
}
