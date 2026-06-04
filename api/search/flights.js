import { readBody, methodNotAllowed, badRequest, serverError, serviceUnavailable, pickString, pickNumber } from '../lib/http.js';
import { hasAmadeusConfig, searchFlightOffers, searchAirportCode } from '../lib/amadeus.js';
import { normalizeFlightOffer, buildDefaultSearchParams } from '../lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  if (!hasAmadeusConfig()) {
    return serviceUnavailable(res, 'Busca de voos requer AMADEUS_API_KEY e AMADEUS_API_SECRET.');
  }

  try {
    const body = await readBody(req);
    const params = buildDefaultSearchParams('flights', body);

    let origin = pickString(params, 'from') || pickString(params, 'origin');
    let destination = pickString(params, 'to') || pickString(params, 'destination');

    if (origin && origin.length > 3) {
      const resolved = await searchAirportCode(origin);
      origin = resolved?.iata || origin.slice(0, 3).toUpperCase();
    }
    if (destination && destination.length > 3) {
      const resolved = await searchAirportCode(destination);
      destination = resolved?.iata || destination.slice(0, 3).toUpperCase();
    }

    origin = origin?.toUpperCase();
    destination = destination?.toUpperCase();

    if (!origin || !destination) {
      return badRequest(res, 'Informe origem e destino (código IATA ou nome da cidade).');
    }

    const offers = await searchFlightOffers({
      origin,
      destination,
      departDate: params.departDate,
      returnDate: params.returnDate,
      adults: pickNumber(params, 'adults', 1),
      max: pickNumber(params, 'max', 12),
    });

    const flights = offers.map((o, i) => normalizeFlightOffer(o, i));
    return res.status(200).json({ flights, meta: { origin, destination, count: flights.length, source: 'amadeus' } });
  } catch (error) {
    return serverError(res, 'Não foi possível buscar voos agora.', error?.message);
  }
}
