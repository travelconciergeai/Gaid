import { readBody, methodNotAllowed, badRequest, serverError, serviceUnavailable, pickString } from '../lib/http.js';
import { searchPlaces, geocodeCity, hasGooglePlaces, hasRapidApi } from '../lib/places.js';
import { normalizePlaceAsTour } from '../lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  if (!hasGooglePlaces() && !hasRapidApi()) {
    return serviceUnavailable(res, 'Busca de lugares requer GOOGLE_PLACES_API_KEY ou RAPIDAPI_KEY.');
  }

  try {
    const body = await readBody(req);
    const query = pickString(body, 'query');
    const city = pickString(body, 'city') || pickString(body, 'destination');
    const category = pickString(body, 'category') || 'general';

    if (!query && !city) {
      return badRequest(res, 'Informe o que buscar ou a cidade.');
    }

    let lat = body.lat;
    let lng = body.lng;
    if (city && (!lat || !lng)) {
      const geo = await geocodeCity(city).catch(() => null);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }

    const catMap = {
      restaurant: 'restaurant',
      hotel: 'hotel',
      tour: 'tour',
      cafe: 'restaurant',
      general: 'tour',
    };

    const places = await searchPlaces({
      query: query || category,
      city,
      lat,
      lng,
      category: catMap[category] || 'tour',
    });

    const results = places.map((p, i) => normalizePlaceAsTour(p, i, city));
    return res.status(200).json({
      places: results,
      meta: { query, city, category, count: results.length },
    });
  } catch (error) {
    return serverError(res, 'Não foi possível buscar lugares agora.', error?.message);
  }
}
