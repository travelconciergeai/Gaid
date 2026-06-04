// ============================================================================
// Gaid Production — tripApi (THE SEAM)
// ----------------------------------------------------------------------------
// The ONE place data enters the app. Every screen reads through here (via the
// store/hooks); no component imports a catalog or fixture.
//
//   ┌───────────────────────────────────────────────────────────────────┐
//   │  BACKEND PLUGS IN HERE — this week.                                 │
//   │  Each method currently resolves EMPTY (the product starts zeroed).  │
//   │  Replace each body with a real fetch(...) keeping the SAME return    │
//   │  shape (see docs 03 + 10). No screen/component changes required.     │
//   └───────────────────────────────────────────────────────────────────┘
//
// `tripApi.__useBackend(adapter)` lets the integration swap all methods at once
// (e.g. point them at REST). Until then everything is empty → approved empty
// states render. NOTHING is fabricated to fill the UI.
// ============================================================================

import { supabase } from './supabaseClient.js';
import { sanitizeDestination, isGenericPlannerPrompt } from './brain/plannerContext.js';

const _net = (ms = 420) => new Promise(r => setTimeout(r, ms));   // simulate latency for skeletons

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error('Usuário não autenticado.');
  return data.user;
}

function normalizeTripContext(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstFilled(...values) {
  return values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim() || '';
}

function inferDestination(prompt = '') {
  const text = String(prompt || '').trim();
  if (isGenericPlannerPrompt(text)) return '';
  const fromPrep = text.match(/\b(?:para|pra|em|no|na|ir para|viajar para)\s+(?:a|o|os|as)?\s*([\wÀ-ÿ' -]{2,60})/i)?.[1];
  return sanitizeDestination(fromPrep || text);
}

function hasFamilyContext(prompt = '') {
  return /\b(fam[ií]lia|familiar|filh[oa]s?|crian[çc]as?|beb[eê]s?|casal com filhos|pais|m[aã]e|pai|av[oó]s?)\b/i.test(String(prompt || ''));
}

function buildTripTitle({ title, destination, prompt }) {
  const safeTitle = firstFilled(title);
  if (safeTitle && !isGenericPlannerPrompt(safeTitle)) return safeTitle;
  const safeDestination = sanitizeDestination(destination);
  if (safeDestination && hasFamilyContext(prompt)) return `${safeDestination} em família`;
  if (safeDestination) return `Roteiro para ${safeDestination}`;
  return 'Nova viagem';
}

const DESTINATION_COVER_CATALOG = [
  {
    key: 'orlando',
    match: /orlando|disney/,
    defaultLabel: 'Orlando Florida',
    covers: [
      { context: 'disney-family', label: 'Orlando · parques em família', match: /disney|magic kingdom|famil|crianc|filh|parque/, url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'universal-parks', label: 'Orlando · Universal e parques', match: /universal|harry potter|parques?/, url: 'https://images.unsplash.com/photo-1602002418082-dd4d8ce2c955?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'shopping', label: 'Orlando · compras', match: /compras?|shopping|outlet/, url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Orlando Florida', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
  {
    key: 'paris',
    match: /paris/,
    defaultLabel: 'Paris France',
    covers: [
      { context: 'romantic', label: 'Paris · viagem romântica', match: /romant|casal|lua de mel/, url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'food-cafe', label: 'Paris · cafés e gastronomia', match: /gastronom|comida|restaurante|cafe|caf[eé]/, url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'family', label: 'Paris · família', match: /famil|crianc|filh|disneyland/, url: 'https://images.unsplash.com/photo-1522098543979-ffc7f79f70cc?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'culture', label: 'Paris · cultura', match: /cultur|museu|arte|historia|história/, url: 'https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Paris France', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
  {
    key: 'bogota',
    match: /bogota|bogotá/,
    defaultLabel: 'Bogotá Colombia',
    covers: [
      { context: 'culture', label: 'Bogotá · cultura e museus', match: /cultur|museu|ouro|candelaria|historia|história/, url: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'nature', label: 'Bogotá · Monserrate e montanha', match: /natureza|monserrate|montanha|trilha|verde/, url: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'food', label: 'Bogotá · gastronomia', match: /gastronom|comida|restaurante|cafe|caf[eé]/, url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Bogotá Colombia', url: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
  {
    key: 'bahia',
    match: /bahia|salvador|trancoso|itacare|itacaré/,
    defaultLabel: 'Bahia Brazil',
    covers: [
      { context: 'beach-relax', label: 'Bahia · praia e descanso', match: /praia|relax|descanso|mar|trancoso|itacare|itacaré/, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'salvador-culture', label: 'Bahia · Salvador e cultura', match: /salvador|pelourinho|cultur|historia|história|musica|música/, url: 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'food', label: 'Bahia · sabores locais', match: /gastronom|comida|restaurante|acaraje|acarajé/, url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Bahia Brazil', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
  {
    key: 'rio',
    match: /rio de janeiro/,
    defaultLabel: 'Rio de Janeiro Brazil',
    covers: [
      { context: 'beach', label: 'Rio · praia', match: /praia|mar|ipanema|copacabana/, url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'culture-food', label: 'Rio · cultura e gastronomia', match: /cultur|gastronom|comida|samba|restaurante/, url: 'https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Rio de Janeiro Brazil', url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
  {
    key: 'japan',
    match: /japao|japan|tokyo|toquio|tóquio|kyoto|quioto/,
    defaultLabel: 'Tokyo Japan',
    covers: [
      { context: 'tokyo-city', label: 'Japão · Tóquio urbano', match: /tokyo|toquio|tóquio|cidade|urbano|compras?/, url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'kyoto-culture', label: 'Japão · cultura e templos', match: /kyoto|quioto|templo|cultur|tradicional|historia|história/, url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'food', label: 'Japão · gastronomia', match: /gastronom|comida|ramen|sushi|restaurante/, url: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Tokyo Japan', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
  {
    key: 'portugal',
    match: /lisboa|porto|portugal/,
    defaultLabel: 'Lisboa Portugal',
    covers: [
      { context: 'lisbon-culture', label: 'Lisboa · cultura', match: /lisboa|cultur|historia|história|azulejo/, url: 'https://images.unsplash.com/photo-1501927023255-9063be98970c?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'porto-food', label: 'Porto · gastronomia e vinho', match: /porto|vinho|gastronom|comida|douro/, url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Lisboa Portugal', url: 'https://images.unsplash.com/photo-1501927023255-9063be98970c?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
  {
    key: 'peru',
    match: /peru|lima|cusco|machu picchu/,
    defaultLabel: 'Peru',
    covers: [
      { context: 'andes-culture', label: 'Peru · Andes e cultura', match: /cusco|machu picchu|andes|cultur|historia|história|trilha/, url: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'lima-food', label: 'Peru · Lima gastronômica', match: /lima|gastronom|comida|restaurante/, url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&h=800&q=80' },
      { context: 'default', label: 'Peru', url: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&h=800&q=80' },
    ],
  },
];

const GENERIC_COVER_IMAGE = {
  context: 'generic',
  label: 'Travel destination',
  url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&h=800&q=80',
};

function stableHash(value = '') {
  return [...String(value)].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
}

function contextText({ destination, title, tripContext, metadata }) {
  return [
    destination,
    title,
    tripContext?.travelerComposition,
    tripContext?.travelers?.composition,
    tripContext?.budget?.label,
    tripContext?.budget,
    tripContext?.comfortLevel,
    ...(Array.isArray(tripContext?.priorities) ? tripContext.priorities : [tripContext?.priorities]),
    ...(Array.isArray(tripContext?.stylePace) ? tripContext.stylePace : [tripContext?.stylePace]),
    ...(Array.isArray(tripContext?.tripPriority) ? tripContext.tripPriority : [tripContext?.tripPriority]),
    ...(Array.isArray(tripContext?.childrenAges) && tripContext.childrenAges.length > 0 ? ['crianças', 'família'] : []),
    metadata?.coverHint,
  ].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function selectTripCover({ destination = '', title = '', tripContext = {}, metadata = {}, stableKey = '' } = {}) {
  const normalizedDestination = firstFilled(destination).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const catalog = DESTINATION_COVER_CATALOG.find(entry => entry.match.test(normalizedDestination));
  if (!catalog) {
    return {
      ...GENERIC_COVER_IMAGE,
      source: 'static-contextual-cover-map',
      query: GENERIC_COVER_IMAGE.label,
      contextKey: 'generic:generic',
    };
  }

  const text = contextText({ destination, title, tripContext, metadata });
  const matches = catalog.covers.filter(cover => cover.match && cover.match.test(text));
  const pool = matches.length > 0 ? matches : catalog.covers.filter(cover => cover.context === 'default');
  const candidates = pool.length > 0 ? pool : [GENERIC_COVER_IMAGE];
  const selected = candidates[stableHash(`${stableKey}:${title}:${text}`) % candidates.length];
  return {
    url: selected.url,
    source: 'static-contextual-cover-map',
    query: selected.label || catalog.defaultLabel,
    contextKey: `${catalog.key}:${selected.context || 'default'}`,
    fallbackQuery: catalog.defaultLabel || GENERIC_COVER_IMAGE.label,
  };
}

function normalizeCoverImage(value, { destination, title, tripContext, metadata, stableKey } = {}) {
  const cover = normalizeTripContext(value);
  const invalid = !cover.url ||
    /source\.unsplash\.com/i.test(String(cover.url)) ||
    cover.source === 'static-destination-map' ||
    !cover.contextKey;
  return invalid
    ? selectTripCover({ destination, title, tripContext, metadata, stableKey })
    : cover;
}

function travelerCount(value) {
  if (typeof value === 'number') return value > 0 ? value : null;
  if (typeof value === 'string') {
    const count = Number(value.match(/\d+/)?.[0]);
    return Number.isFinite(count) && count > 0 ? count : null;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const count = Number(value.count);
    return Number.isFinite(count) && count > 0 ? count : null;
  }
  return null;
}

function rowToTrip(row) {
  if (!row) return null;
  const tripContext = normalizeTripContext(row.trip_context);
  const metadata = normalizeTripContext(row.metadata);
  const destination = firstFilled(row.destination, tripContext.destination, metadata.destination);
  const coverImage = normalizeCoverImage(tripContext.coverImage || metadata.coverImage, {
    destination,
    title: row.title,
    tripContext,
    metadata,
    stableKey: row.id || row.title,
  });
  return {
    id: row.id,
    title: row.title,
    destination,
    status: row.status || 'planning',
    dates: tripContext.dates || metadata.dates || null,
    nights: tripContext.nights ?? metadata.nights ?? null,
    travelers: travelerCount(tripContext.travelers) ?? travelerCount(tripContext.travelerCount) ?? travelerCount(metadata.travelers),
    budget: tripContext.budget || metadata.budget || null,
    cities: destination ? [destination] : [],
    cover: metadata.cover || tripContext.cover || 'warm',
    coverImage,
    coverShort: destination || row.title || '',
    coverSeed: `trip-${row.id}`,
    coverLabel: destination || row.title || '',
    progress: tripContext.progress ?? metadata.progress ?? 0,
    days: Array.isArray(tripContext.days) ? tripContext.days : [],
    insights: Array.isArray(tripContext.insights) ? tripContext.insights : [],
    tripContext,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function archiveTripRow(id) {
  if (!id) return null;
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('trips')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return rowToTrip(data);
}

async function deleteTripRow(id) {
  if (!id) return { success: false };
  const user = await getAuthenticatedUser();
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  return { success: true, id };
}

async function patchTripRow(id, ops = {}) {
  if (!id) return null;
  const user = await getAuthenticatedUser();
  const { data: current, error: loadError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!current) return null;

  const currentContext = normalizeTripContext(current.trip_context);
  const incomingContext = normalizeTripContext(ops.trip_context || ops.tripContext || ops.context);
  const nextContext = {
    ...currentContext,
    ...incomingContext,
  };
  if (Array.isArray(ops.days)) nextContext.days = ops.days;
  if (ops.progress !== undefined) nextContext.progress = ops.progress;

  const patch = { trip_context: nextContext };
  if (ops.title !== undefined) patch.title = ops.title;
  if (ops.destination !== undefined) patch.destination = ops.destination;
  if (ops.status !== undefined) patch.status = ops.status;
  if (ops.metadata !== undefined) patch.metadata = {
    ...normalizeTripContext(current.metadata),
    ...normalizeTripContext(ops.metadata),
  };

  const { data, error } = await supabase
    .from('trips')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return rowToTrip(data);
}

function normalizeChatRole(role) {
  return role === 'assistant' ? 'assistant' : 'user';
}

function rowToChatMessage(row) {
  if (!row) return null;
  const metadata = normalizeTripContext(row.metadata);
  return {
    id: row.id,
    tripId: row.trip_id,
    role: normalizeChatRole(row.role),
    content: row.content || '',
    source: row.source || metadata.source || null,
    metadata,
    createdAt: row.created_at,
  };
}

// Default adapter: the product, zeroed. Every collection empty, every lookup null.
const _emptyAdapter = {
  // viagens (Trip = fonte da verdade)
  async listTrips() {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToTrip);
  },
  async getTrip(id) {
    if (!id) return null;
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return rowToTrip(data);
  },
  async createTrip(input = {}) {
    const user = await getAuthenticatedUser();
    const rawInput = typeof input === 'object' && input !== null ? input : { prompt: String(input || '') };
    const prompt = firstFilled(rawInput.prompt, rawInput.message, rawInput.initialPrompt);
    const incomingContext = normalizeTripContext(rawInput.trip_context || rawInput.tripContext || rawInput.context);
    const destination = sanitizeDestination(
      firstFilled(rawInput.destination, incomingContext.destination, inferDestination(prompt))
    );
    const title = buildTripTitle({ title: rawInput.title, destination, prompt });
    const baseMetadata = normalizeTripContext(rawInput.metadata);
    const coverImage = normalizeCoverImage(incomingContext.coverImage || baseMetadata.coverImage, {
      destination,
      title,
      tripContext: incomingContext,
      metadata: baseMetadata,
      stableKey: `${user.id}:${title}:${prompt}`,
    });
    const tripContext = {
      ...incomingContext,
      prompt,
      destination: destination || incomingContext.destination || null,
      coverImage,
      days: Array.isArray(incomingContext.days) ? incomingContext.days : [],
      progress: incomingContext.progress ?? 0,
    };
    const metadata = {
      ...baseMetadata,
      coverImage,
    };
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        title,
        destination: destination || null,
        status: 'planning',
        trip_context: tripContext,
        metadata,
      })
      .select('*')
      .single();
    if (error) throw error;
    return rowToTrip(data);
  },
  async createTripFromTemplate(_templateId) { return null; },
  async patchTrip(id, ops) { return patchTripRow(id, ops); },
  async archiveTrip(id) { return archiveTripRow(id); },
  async deleteTrip(id) { return deleteTripRow(id); },
  async listChatMessages(tripId) {
    if (!tripId) return [];
    await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToChatMessage).filter(Boolean);
  },
  async createChatMessage({ tripId, role, text, metadata = {} } = {}) {
    if (!tripId || !text) return null;
    await getAuthenticatedUser();
    const safeRole = normalizeChatRole(role);
    const safeMetadata = normalizeTripContext(metadata);
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        trip_id: tripId,
        role: safeRole,
        content: text,
        metadata: safeMetadata,
      })
      .select('*')
      .single();
    if (error) throw error;
    return rowToChatMessage(data);
  },
  async saveChatTurn({ tripId, userText, assistantText, source, metadata = {} } = {}) {
    if (!tripId) return [];
    await getAuthenticatedUser();
    const safeMetadata = normalizeTripContext(metadata);
    const rows = [
      userText ? {
        trip_id: tripId,
        role: 'user',
        content: userText,
        metadata: { ...safeMetadata, surface: safeMetadata.surface || 'plan' },
      } : null,
      assistantText ? {
        trip_id: tripId,
        role: 'assistant',
        content: assistantText,
        metadata: { ...safeMetadata, source, surface: safeMetadata.surface || 'plan' },
      } : null,
    ].filter(Boolean);
    if (rows.length === 0) return [];
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(rows)
      .select('*');
    if (error) throw error;
    return (data || []).map(rowToChatMessage).filter(Boolean);
  },
  async applyHotel(_tripId, _hotelId, _nights) { return null; },
  async applyFlight(_tripId, _flightId, _dayId) { return null; },
  async applyTour(_tripId, _tourId, _dayId, _slot) { return null; },
  // catálogo / busca (carrosséis)
  async searchHotels(_q) { return []; },
  async searchFlights(_q) { return []; },
  async searchTours(_q) { return []; },
  async listTemplates(_q) { return []; },     // roteiros sugeridos
  async getTemplate(_id) { return null; },
  async listExperts(_q) { return []; },
  async listPlans() { return []; },
  async listDestinations(_q) { return {}; },     // curated destinations (grouped by region)
  // perfil / sessão (TravelProfile vem do onboarding; backend confirma)
  async getTravelProfile() { return null; },
  async sendChatMessage({ message, history = [], context = {} } = {}) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        text: data?.text || 'Não consegui falar com a Gaid agora. Tente novamente em instantes.',
        source: data?.source || 'error',
      };
    }
    const payload = {
      text: data?.text || 'Não consegui obter uma resposta da IA agora. Tente novamente em instantes.',
      source: data?.source || 'error',
    };
    if (Array.isArray(data?.itinerarySuggestions)) {
      payload.itinerarySuggestions = data.itinerarySuggestions;
    }
    return payload;
  },
};

let _adapter = _emptyAdapter;

const tripApi = new Proxy({}, {
  get(_t, key) {
    if (key === '__useBackend') {
      return (adapter) => { _adapter = { ..._emptyAdapter, ...adapter }; };
    }
    if (key === '__reset') return () => { _adapter = _emptyAdapter; };
    const fn = _adapter[key];
    if (typeof fn !== 'function') return undefined;
    // wrap so every call has a tiny latency (drives loading skeletons honestly)
    return async (...args) => { await _net(); return fn(...args); };
  },
});


export { tripApi };
