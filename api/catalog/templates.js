import { readBody, methodNotAllowed, serverError, pickString } from '../lib/http.js';
import { listExpertPackages } from '../lib/brain.js';
import { normalizeExpertPackage } from '../lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const body = await readBody(req);
    const destination = pickString(body, 'destination') || pickString(body, 'city');
    const packages = await listExpertPackages({ destination, limit: body.limit || 20 });
    return res.status(200).json({
      templates: packages.map(normalizeExpertPackage),
      count: packages.length,
    });
  } catch (error) {
    return serverError(res, 'Não foi possível listar roteiros.', error?.message);
  }
}
