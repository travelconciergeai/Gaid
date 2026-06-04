const PLACES_BASE = 'https://places.googleapis.com/v1';

function hasGooglePlaces() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

function hasRapidApi() {
  return Boolean(process.env.RAPIDAPI_KEY);
}

async function googlePlacesSearch({ query, lat, lng, type }) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY não configurado.');

  const body = {
    textQuery: query,
    languageCode: 'pt-BR',
    maxResultCount: 15,
  };
  if (lat && lng) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 15000 },
    };
  }
  if (type) body.includedType = type;

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.types',
        'places.location',
        'places.photos',
        'places.googleMapsUri',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Falha na busca Google Places.');
  }
  return data?.places || [];
}

async function rapidApiTripAdvisorSearch({ query, lat, lng }) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY não configurado.');

  const params = new URLSearchParams({ query, language: 'pt' });
  if (lat && lng) {
    params.set('lat', lat);
    params.set('lng', lng);
  }

  const res = await fetch(
    `https://travel-advisor.p.rapidapi.com/locations/search?${params}`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com',
      },
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || 'Falha na busca TripAdvisor.');
  }
  return data?.data || [];
}

async function rapidApiAttractionsSearch({ destinationId }) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY não configurado.');

  const res = await fetch(
    `https://travel-advisor.p.rapidapi.com/attractions/list?location_id=${destinationId}&currency=BRL&lang=pt_BR`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com',
      },
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || 'Falha ao buscar atrações.');
  }
  return data?.data || [];
}

export { hasGooglePlaces, hasRapidApi };

export async function searchPlaces({ query, city, lat, lng, category = 'tour' }) {
  const q = city ? `${query || category} em ${city}` : (query || category);

  if (hasGooglePlaces()) {
    const typeMap = {
      tour: 'tourist_attraction',
      restaurant: 'restaurant',
      hotel: 'lodging',
    };
    return googlePlacesSearch({ query: q, lat, lng, type: typeMap[category] || undefined });
  }

  if (hasRapidApi()) {
    const locations = await rapidApiTripAdvisorSearch({ query: city || query, lat, lng });
    const dest = locations.find(l => l.result_type === 'city' || l.result_type === 'geos') || locations[0];
    if (!dest?.location_id) return [];
    const attractions = await rapidApiAttractionsSearch({ destinationId: dest.location_id });
    return attractions.map(a => ({
      id: a.location_id,
      displayName: { text: a.name },
      formattedAddress: a.address || dest.name,
      rating: Number(a.rating) || null,
      userRatingCount: Number(a.num_reviews) || null,
      priceLevel: null,
      types: [a.category?.name || 'attraction'],
      location: a.latitude && a.longitude
        ? { latitude: Number(a.latitude), longitude: Number(a.longitude) }
        : null,
      googleMapsUri: a.web_url,
      _source: 'tripadvisor',
    }));
  }

  throw new Error('Configure GOOGLE_PLACES_API_KEY ou RAPIDAPI_KEY para buscas de lugares.');
}

export async function geocodeCity(city) {
  if (!hasGooglePlaces()) return null;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.location,places.displayName',
    },
    body: JSON.stringify({ textQuery: city, languageCode: 'pt-BR', maxResultCount: 1 }),
  });
  const data = await res.json();
  const place = data?.places?.[0];
  if (!place?.location) return null;
  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    name: place.displayName?.text,
  };
}
