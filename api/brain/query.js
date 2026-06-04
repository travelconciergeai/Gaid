import { readBody, methodNotAllowed, badRequest, serverError, pickString } from '../lib/http.js';
import { queryBrain, formatBrainContext } from '../lib/brain.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const body = await readBody(req);
    const query = pickString(body, 'query');
    const destination = pickString(body, 'destination');
    const category = pickString(body, 'category') || null;
    const limit = Number(body.limit) || 8;

    if (!query && !destination) {
      return badRequest(res, 'Informe uma pergunta ou destino para consultar o cérebro Voia.');
    }

    const { entries, source } = await queryBrain({ query, destination, category, limit });
    const context = formatBrainContext(entries);

    return res.status(200).json({
      entries,
      context,
      count: entries.length,
      source,
    });
  } catch (error) {
    return serverError(res, 'Não foi possível consultar o cérebro Voia.', error?.message);
  }
}
