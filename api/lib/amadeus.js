const AMADEUS_BASE = process.env.AMADEUS_ENV === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;
  if (!key || !secret) {
    throw new Error('AMADEUS_API_KEY e AMADEUS_API_SECRET não configurados.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: key,
    client_secret: secret,
  });

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || 'Falha ao autenticar na Amadeus.');
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 1800) * 1000;
  return cachedToken;
}

async function amadeusFetch(path, params = {}) {
  const token = await getAccessToken();
  const url = new URL(`${AMADEUS_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    const detail = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || JSON.stringify(data);
    throw new Error(`Amadeus ${path}: ${detail}`);
  }
  return data;
}

export function hasAmadeusConfig() {
  return Boolean(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
}

export async function searchAirportCode(keyword) {
  if (!keyword || keyword.length < 2) return null;
  const data = await amadeusFetch('/v1/reference-data/locations', {
    subType: 'AIRPORT,CITY',
    keyword: keyword.slice(0, 40),
    'page[limit]': 5,
  });
  const hit = data?.data?.[0];
  if (!hit) return null;
  return {
    iata: hit.iataCode,
    name: hit.name,
    city: hit.address?.cityName,
    country: hit.address?.countryCode,
  };
}

export async function searchFlightOffers({
  origin,
  destination,
  departDate,
  returnDate,
  adults = 1,
  max = 10,
}) {
  const params = {
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate: departDate,
    adults,
    max,
    currencyCode: 'BRL',
  };
  if (returnDate) params.returnDate = returnDate;

  const data = await amadeusFetch('/v2/shopping/flight-offers', params);
  return data?.data || [];
}

export async function searchHotelsByCity(cityCode) {
  const data = await amadeusFetch('/v1/reference-data/locations/hotels/by-city', {
    cityCode,
  });
  return data?.data || [];
}

export async function searchHotelOffers({
  hotelIds,
  checkIn,
  checkOut,
  adults = 1,
}) {
  if (!hotelIds?.length) return [];
  const data = await amadeusFetch('/v3/shopping/hotel-offers', {
    hotelIds: hotelIds.slice(0, 20).join(','),
    checkInDate: checkIn,
    checkOutDate: checkOut,
    adults,
    currency: 'BRL',
  });
  return data?.data || [];
}

export async function searchCityCode(keyword) {
  if (!keyword || keyword.length < 2) return null;
  const data = await amadeusFetch('/v1/reference-data/locations', {
    subType: 'CITY',
    keyword: keyword.slice(0, 40),
    'page[limit]': 3,
  });
  const hit = data?.data?.find(l => l.iataCode);
  return hit?.iataCode || null;
}

export { amadeusFetch };
