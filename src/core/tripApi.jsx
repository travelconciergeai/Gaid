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
  const match = text.match(/\b(?:para|pra|em|no|na)\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wÀ-ÿ' -]{2,60})/);
  return match?.[1]?.replace(/[,.!?;:].*$/, '').trim() || '';
}

function hasFamilyContext(prompt = '') {
  return /\b(fam[ií]lia|familiar|filh[oa]s?|crian[çc]as?|beb[eê]s?|casal com filhos|pais|m[aã]e|pai|av[oó]s?)\b/i.test(String(prompt || ''));
}

function buildTripTitle({ title, destination, prompt }) {
  if (firstFilled(title)) return firstFilled(title);
  if (destination && hasFamilyContext(prompt)) return `${destination} em família`;
  if (destination) return `Roteiro para ${destination}`;
  return 'Nova viagem';
}

function travelerCount(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const count = Number(value.count);
    return Number.isFinite(count) ? count : 0;
  }
  return 0;
}

function rowToTrip(row) {
  if (!row) return null;
  const tripContext = normalizeTripContext(row.trip_context);
  const metadata = normalizeTripContext(row.metadata);
  const destination = firstFilled(row.destination, tripContext.destination, metadata.destination);
  return {
    id: row.id,
    title: row.title,
    destination,
    status: row.status || 'planning',
    dates: tripContext.dates || metadata.dates || null,
    nights: tripContext.nights ?? metadata.nights ?? null,
    travelers: travelerCount(tripContext.travelers ?? metadata.travelers),
    budget: tripContext.budget || metadata.budget || null,
    cities: destination ? [destination] : [],
    cover: metadata.cover || tripContext.cover || 'warm',
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
    const destination = firstFilled(rawInput.destination, incomingContext.destination, inferDestination(prompt));
    const title = buildTripTitle({ title: rawInput.title, destination, prompt });
    const tripContext = {
      ...incomingContext,
      prompt,
      destination: destination || incomingContext.destination || null,
      days: Array.isArray(incomingContext.days) ? incomingContext.days : [],
      progress: incomingContext.progress ?? 0,
    };
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        title,
        destination: destination || null,
        status: 'planning',
        trip_context: tripContext,
        metadata: normalizeTripContext(rawInput.metadata),
      })
      .select('*')
      .single();
    if (error) throw error;
    return rowToTrip(data);
  },
  async createTripFromTemplate(_templateId) { return null; },
  async patchTrip(_id, _ops) { return null; },
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
    return {
      text: data?.text || 'Não consegui obter uma resposta da IA agora. Tente novamente em instantes.',
      source: data?.source || 'error',
    };
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
