import { readBody, methodNotAllowed, badRequest, serverError, serviceUnavailable, pickString } from '../lib/http.js';
import { searchPlaces, geocodeCity, hasGooglePlaces, hasRapidApi } from '../lib/places.js';
import { normalizePlaceAsTour } from '../lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  if (!hasGooglePlaces() && !hasRapidApi()) {
    return serviceUnavailable(res, 'Busca de passeios requer GOOGLE_PLACES_API_KEY ou RAPIDAPI_KEY.');
  }

  try {
    const body = await readBody(req);
    const city = pickString(body, 'city') || pickString(body, 'destination');
    const query = pickString(body, 'query') || 'passeios e experiências';

    if (!city) {
      return badRequest(res, 'Informe a cidade ou destino.');
    }

    let lat = body.lat;
    let lng = body.lng;
    if (!lat || !lng) {
      const geo = await geocodeCity(city).catch(() => null);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }

    const places = await searchPlaces({ query, city, lat, lng, category: 'tour' });
    const tours = places.map((p, i) => normalizePlaceAsTour(p, i, city));

    return res.status(200).json({
      tours,
      meta: {
        city,
        count: tours.length,
        source: hasGooglePlaces() ? 'google-places' : 'tripadvisor',
      },
    });
  } catch (error) {
    return serverError(res, 'Não foi possível buscar passeios agora.', error?.message);
  }
}
