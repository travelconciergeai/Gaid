import { readBody, methodNotAllowed, serverError } from '../lib/http.js';
import { listExperts, listExpertPackages } from '../lib/brain.js';
import { normalizeExpert, normalizeExpertPackage } from '../lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const body = await readBody(req);
    const experts = await listExperts({ limit: body.limit || 20 });
    return res.status(200).json({
      experts: experts.map(normalizeExpert),
      count: experts.length,
    });
  } catch (error) {
    return serverError(res, 'Não foi possível listar experts.', error?.message);
  }
}
