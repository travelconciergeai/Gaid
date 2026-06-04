import { readBody, methodNotAllowed, badRequest, serverError, serviceUnavailable, pickString, pickNumber } from '../lib/http.js';
import { hasAmadeusConfig, searchCityCode, searchHotelsByCity, searchHotelOffers } from '../lib/amadeus.js';
import { normalizeHotelOffer, buildDefaultSearchParams, addDays } from '../lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  if (!hasAmadeusConfig()) {
    return serviceUnavailable(res, 'Busca de hotéis requer AMADEUS_API_KEY e AMADEUS_API_SECRET.');
  }

  try {
    const body = await readBody(req);
    const params = buildDefaultSearchParams('hotels', body);
    const city = pickString(params, 'city') || pickString(params, 'destination');

    if (!city) {
      return badRequest(res, 'Informe a cidade ou destino.');
    }

    const cityCode = pickString(params, 'cityCode') || await searchCityCode(city);
    if (!cityCode) {
      return res.status(200).json({ hotels: [], meta: { city, count: 0, source: 'amadeus' } });
    }

    const hotelList = await searchHotelsByCity(cityCode);
    const hotelIds = hotelList.map(h => h.hotelId).filter(Boolean);
    if (!hotelIds.length) {
      return res.status(200).json({ hotels: [], meta: { city, cityCode, count: 0, source: 'amadeus' } });
    }

    const checkIn = params.checkIn;
    const checkOut = params.checkOut || addDays(checkIn, 3);
    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));

    const offers = await searchHotelOffers({
      hotelIds,
      checkIn,
      checkOut,
      adults: pickNumber(params, 'adults', 1),
    });

    const hotels = offers.map((o, i) => normalizeHotelOffer(o, i, nights));
    return res.status(200).json({ hotels, meta: { city, cityCode, checkIn, checkOut, count: hotels.length, source: 'amadeus' } });
  } catch (error) {
    return serverError(res, 'Não foi possível buscar hotéis agora.', error?.message);
  }
}
