import {
  toneFromSeed,
  formatDurationMinutes,
  formatStops,
  formatPriceBRL,
  defaultDepartDate,
  defaultReturnDate,
  addDays,
} from './http.js';

const AIRLINE_NAMES = {
  LA: 'LATAM', G3: 'GOL', AD: 'Azul', AA: 'American', DL: 'Delta',
  UA: 'United', AF: 'Air France', BA: 'British Airways', LH: 'Lufthansa',
  IB: 'Iberia', TP: 'TAP', EK: 'Emirates', QR: 'Qatar', KL: 'KLM',
};

function airlineName(code) {
  return AIRLINE_NAMES[code] || code || 'Companhia';
}

function parseIsoDuration(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  return (Number(m[1] || 0) * 60) + Number(m[2] || 0);
}

function formatTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function normalizeFlightOffer(offer, index = 0) {
  const itinerary = offer.itineraries?.[0];
  const segment = itinerary?.segments?.[0];
  const lastSeg = itinerary?.segments?.[itinerary.segments.length - 1];
  const stops = Math.max(0, (itinerary?.segments?.length || 1) - 1);
  const durMin = parseIsoDuration(itinerary?.duration);
  const price = Number(offer.price?.total);
  const currency = offer.price?.currency || 'BRL';
  const carrier = segment?.carrierCode || offer.validatingAirlineCodes?.[0];

  return {
    id: offer.id || `flt_${index}`,
    from: segment?.departure?.iataCode || null,
    to: lastSeg?.arrival?.iataCode || null,
    dep: formatTime(segment?.departure?.at),
    arr: formatTime(lastSeg?.arrival?.at),
    airline: airlineName(carrier),
    flight: segment?.number ? `${carrier}${segment.number}` : null,
    stops: formatStops(stops),
    dur: formatDurationMinutes(durMin),
    price: formatPriceBRL(price, currency),
    priceValue: price,
    miles: null,
    best: index === 0 ? 'preço' : null,
    tone: toneFromSeed(offer.id || String(index)),
    cabin: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
    baggage: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags?.quantity
      ? `${offer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags.quantity} bagagem`
      : 'Consultar',
    _raw: offer,
  };
}

export function normalizeHotelOffer(offer, index = 0, nights = 1) {
  const hotel = offer.hotel || {};
  const bestOffer = offer.offers?.[0];
  const price = Number(bestOffer?.price?.total);
  const currency = bestOffer?.price?.currency || 'BRL';

  return {
    id: hotel.hotelId || `htl_${index}`,
    name: hotel.name || null,
    city: hotel.cityCode || hotel.address?.cityName || null,
    rating: hotel.rating ? Number(hotel.rating).toFixed(1) : null,
    nights,
    price: formatPriceBRL(price, currency),
    priceValue: price,
    perk: bestOffer?.policies?.cancellation?.description?.text?.slice(0, 80) || 'Curadoria Voia',
    tone: toneFromSeed(hotel.hotelId || String(index)),
    tag: hotel.hotelId ? 'Voia Collection' : null,
    _raw: offer,
  };
}

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 'Grátis',
  PRICE_LEVEL_INEXPENSIVE: '€',
  PRICE_LEVEL_MODERATE: '€€',
  PRICE_LEVEL_EXPENSIVE: '€€€',
  PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
};

export function normalizePlaceAsTour(place, index = 0, city = '') {
  const name = place.displayName?.text || place.name || null;
  const rating = place.rating ? Number(place.rating).toFixed(1) : null;
  const priceLevel = PRICE_LEVEL_MAP[place.priceLevel] || null;

  return {
    id: place.id || place.location_id || `tour_${index}`,
    name,
    city: city || place.formattedAddress?.split(',').pop()?.trim() || null,
    dur: '2–4 h',
    price: priceLevel || (rating ? `★ ${rating}` : null),
    priceValue: null,
    host: place._source === 'tripadvisor' ? 'TripAdvisor' : 'Google Places',
    rating,
    reviewCount: place.userRatingCount || place.num_reviews || null,
    tone: toneFromSeed(name || String(index)),
    address: place.formattedAddress || place.address || null,
    mapsUrl: place.googleMapsUri || place.web_url || null,
    lat: place.location?.latitude || place.latitude || null,
    lng: place.location?.longitude || place.longitude || null,
    _raw: place,
  };
}

export function normalizeExpert(expert) {
  return {
    id: expert.id,
    name: expert.name,
    slug: expert.slug,
    bio: expert.bio,
    avatar: expert.avatar_url,
    specialties: expert.specialties || [],
    countries: expert.countries || [],
    verified: expert.verified,
    rating: expert.rating ? Number(expert.rating).toFixed(1) : null,
    tripsSold: expert.trips_sold || 0,
    tone: toneFromSeed(expert.slug),
  };
}

export function normalizeExpertPackage(pkg) {
  return {
    id: pkg.id,
    slug: pkg.slug,
    title: pkg.title,
    description: pkg.description,
    expert: pkg.experts?.name || null,
    expertSlug: pkg.experts?.slug || null,
    destination: pkg.destinations?.name || null,
    durationDays: pkg.duration_days,
    price: pkg.price_from ? formatPriceBRL(Number(pkg.price_from), pkg.currency || 'BRL') : null,
    coverImage: pkg.cover_image,
    tags: pkg.tags || [],
    salesCount: pkg.sales_count || 0,
    tone: toneFromSeed(pkg.slug),
  };
}

export function buildDefaultSearchParams(kind, params = {}) {
  const depart = params.departDate || params.checkIn || defaultDepartDate();
  const ret = params.returnDate || params.checkOut || defaultReturnDate(depart);
  return {
    ...params,
    departDate: depart,
    returnDate: ret,
    checkIn: params.checkIn || depart,
    checkOut: params.checkOut || ret,
    adults: params.adults || 1,
  };
}

export { addDays, defaultDepartDate, defaultReturnDate };
