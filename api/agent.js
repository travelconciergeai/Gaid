import { readBody, methodNotAllowed, badRequest, serverError, serviceUnavailable, pickString, defaultDepartDate, defaultReturnDate } from './lib/http.js';
import { queryBrain, formatBrainContext } from './lib/brain.js';
import { hasAmadeusConfig, searchFlightOffers, searchAirportCode, searchCityCode, searchHotelsByCity, searchHotelOffers } from './lib/amadeus.js';
import { searchPlaces, geocodeCity, hasGooglePlaces, hasRapidApi } from './lib/places.js';
import { normalizeFlightOffer, normalizeHotelOffer, normalizePlaceAsTour, addDays } from './lib/catalog.js';

const VOIA_SYSTEM = `
Você é a Voia — copilot de viagens premium para brasileiros.

Sua expertise:
- Criar roteiros personalizados com conhecimento real de experts que viajaram o mundo
- Buscar voos, hotéis e passeios reais através das ferramentas disponíveis
- Acompanhar a viagem no "Modo Viagem" — alertas, imprevistos, alternativas

Sua voz:
- Humana, calorosa, segura e objetiva
- Sofisticada sem ser formal demais
- Como uma consultora de viagens experiente, não um relatório de IA

Como responder:
- Português do Brasil
- Conversa curta e natural
- Sem markdown pesado, sem ### ou **
- Máximo 3 bullets quando necessário
- Uma ou duas perguntas por vez quando faltar informação

O que fazer:
- Use as ferramentas para buscar dados REAIS antes de recomendar voos, hotéis ou passeios
- Consulte o cérebro Voia (brain_query) para dicas de experts antes de dar recomendações genéricas
- Ajude a planejar, editar roteiro, budget, pessoas, voos e hotéis
- No Modo Viagem, sugira alternativas quando houver imprevistos (chuva, cancelamento, etc.)

Limites:
- NUNCA invente preços, disponibilidade ou reservas confirmadas
- Se a ferramenta não retornar dados, diga honestamente e sugira o próximo passo
- Respeite o usuário — experiências incríveis são o princípio básico

Formato técnico:
- Retorne SOMENTE JSON válido:
{
  "text": "mensagem natural para o chat",
  "actions": [{ "type": "navigate|search|alert", "target": "...", "label": "..." }],
  "itinerarySuggestions": [{ "day": 1, "slot": "manhã", "title": "...", "place": "...", "dur": "...", "tag": "...", "vibe": "..." }]
}
- text é obrigatório
- actions e itinerarySuggestions são opcionais
`.trim();

const TOOLS = [
  {
    type: 'function',
    name: 'brain_query',
    description: 'Consulta o cérebro Voia — conhecimento curado por experts reais sobre destinos, restaurantes, dicas, roteiros.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Pergunta ou tema (ex: restaurantes românticos, dicas com crianças)' },
        destination: { type: 'string', description: 'Destino (ex: Paris, Orlando, Tóquio)' },
        category: { type: 'string', enum: ['tip','restaurant','hotel','activity','route','warning','insider','transport','budget','season','family','general'] },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'search_flights',
    description: 'Busca voos reais com preços via Amadeus.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Origem (cidade ou código IATA, ex: GRU, São Paulo)' },
        to: { type: 'string', description: 'Destino (cidade ou código IATA, ex: CDG, Paris)' },
        departDate: { type: 'string', description: 'Data ida YYYY-MM-DD' },
        returnDate: { type: 'string', description: 'Data volta YYYY-MM-DD (opcional)' },
        adults: { type: 'number', description: 'Número de adultos' },
      },
      required: ['from', 'to'],
    },
  },
  {
    type: 'function',
    name: 'search_hotels',
    description: 'Busca hotéis reais com preços via Amadeus.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Cidade ou destino' },
        checkIn: { type: 'string', description: 'Check-in YYYY-MM-DD' },
        checkOut: { type: 'string', description: 'Check-out YYYY-MM-DD' },
        adults: { type: 'number' },
      },
      required: ['city'],
    },
  },
  {
    type: 'function',
    name: 'search_tours',
    description: 'Busca passeios e experiências reais via Google Places ou TripAdvisor.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Cidade' },
        query: { type: 'string', description: 'Tipo de experiência (ex: museus, gastronomia, aventura)' },
      },
      required: ['city'],
    },
  },
  {
    type: 'function',
    name: 'search_places',
    description: 'Busca restaurantes, cafés, atrações em tempo real.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        city: { type: 'string' },
        category: { type: 'string', enum: ['restaurant','hotel','tour','cafe','general'] },
      },
      required: ['query', 'city'],
    },
  },
];

async function resolveIata(codeOrCity) {
  if (!codeOrCity) return null;
  if (codeOrCity.length === 3) return codeOrCity.toUpperCase();
  const hit = await searchAirportCode(codeOrCity);
  return hit?.iata || null;
}

async function executeTool(name, args) {
  switch (name) {
    case 'brain_query': {
      const { entries, source } = await queryBrain({
        query: args.query,
        destination: args.destination,
        category: args.category,
      });
      return { entries: entries.slice(0, 6), context: formatBrainContext(entries), source };
    }
    case 'search_flights': {
      if (!hasAmadeusConfig()) return { error: 'Amadeus não configurado.' };
      const origin = await resolveIata(args.from);
      const destination = await resolveIata(args.to);
      if (!origin || !destination) return { error: 'Não foi possível resolver origem/destino.' };
      const offers = await searchFlightOffers({
        origin,
        destination,
        departDate: args.departDate || defaultDepartDate(),
        returnDate: args.returnDate || defaultReturnDate(args.departDate),
        adults: args.adults || 1,
        max: 6,
      });
      return { flights: offers.map((o, i) => normalizeFlightOffer(o, i)) };
    }
    case 'search_hotels': {
      if (!hasAmadeusConfig()) return { error: 'Amadeus não configurado.' };
      const cityCode = await searchCityCode(args.city);
      if (!cityCode) return { hotels: [] };
      const hotelList = await searchHotelsByCity(cityCode);
      const checkIn = args.checkIn || defaultDepartDate();
      const checkOut = args.checkOut || addDays(checkIn, 3);
      const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
      const offers = await searchHotelOffers({
        hotelIds: hotelList.map(h => h.hotelId).filter(Boolean).slice(0, 15),
        checkIn,
        checkOut,
        adults: args.adults || 1,
      });
      return { hotels: offers.map((o, i) => normalizeHotelOffer(o, i, nights)) };
    }
    case 'search_tours': {
      if (!hasGooglePlaces() && !hasRapidApi()) return { error: 'Places API não configurada.' };
      const geo = await geocodeCity(args.city).catch(() => null);
      const places = await searchPlaces({
        query: args.query || 'passeios',
        city: args.city,
        lat: geo?.lat,
        lng: geo?.lng,
        category: 'tour',
      });
      return { tours: places.slice(0, 8).map((p, i) => normalizePlaceAsTour(p, i, args.city)) };
    }
    case 'search_places': {
      if (!hasGooglePlaces() && !hasRapidApi()) return { error: 'Places API não configurada.' };
      const geo = await geocodeCity(args.city).catch(() => null);
      const places = await searchPlaces({
        query: args.query,
        city: args.city,
        lat: geo?.lat,
        lng: geo?.lng,
        category: args.category || 'general',
      });
      return { places: places.slice(0, 8).map((p, i) => normalizePlaceAsTour(p, i, args.city)) };
    }
    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

function stripJsonFences(value = '') {
  return String(value).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseAgentPayload(raw) {
  try {
    const parsed = JSON.parse(stripJsonFences(raw));
    if (parsed?.text) return parsed;
  } catch (_e) { /* fallthrough */ }
  return { text: raw };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return serviceUnavailable(res, 'OPENAI_API_KEY não configurada.');
  }

  const body = await readBody(req);
  const message = pickString(body, 'message');
  const history = Array.isArray(body.history) ? body.history : [];
  const context = body.context || {};

  if (!message) return badRequest(res, 'Envie uma mensagem para a Voia.');

  const input = [
    ...history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.text || h.content || '').slice(0, 1500),
    })),
    { role: 'user', content: message },
  ];

  try {
    let response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        instructions: `${VOIA_SYSTEM}\n\nContexto: ${JSON.stringify(context).slice(0, 1500)}`,
        input,
        tools: TOOLS,
        max_output_tokens: 2000,
      }),
    });

    let data = await response.json();
    if (!response.ok) {
      return serverError(res, 'Voia indisponível momentaneamente.', data?.error?.message);
    }

    const toolCalls = [];
    let iterations = 0;
    const maxIterations = 4;

    while (iterations < maxIterations) {
      const outputs = data.output || [];
      const functionCalls = outputs.filter(o => o.type === 'function_call');

      if (!functionCalls.length) break;

      const toolResults = [];
      for (const call of functionCalls) {
        let args = {};
        try { args = JSON.parse(call.arguments || '{}'); } catch (_e) { args = {}; }
        const result = await executeTool(call.name, args);
        toolCalls.push({ name: call.name, args, result: summarizeResult(result) });
        toolResults.push({
          type: 'function_call_output',
          call_id: call.call_id || call.id,
          output: JSON.stringify(result).slice(0, 8000),
        });
      }

      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          instructions: VOIA_SYSTEM,
          input: [...input, ...outputs, ...toolResults],
          tools: TOOLS,
          max_output_tokens: 2000,
        }),
      });

      data = await response.json();
      if (!response.ok) break;
      iterations++;
    }

    const rawText = data.output_text ||
      data.output?.flatMap(o => o.content || []).find(c => c.type === 'output_text')?.text;

    if (!rawText) {
      return serverError(res, 'Voia não conseguiu gerar resposta.');
    }

    const payload = parseAgentPayload(rawText);
    return res.status(200).json({
      text: payload.text,
      actions: payload.actions || [],
      itinerarySuggestions: payload.itinerarySuggestions || [],
      toolCalls,
      source: 'voia-agent',
    });
  } catch (error) {
    return serverError(res, 'Erro no agente Voia.', error?.message);
  }
}

function summarizeResult(result) {
  if (!result || typeof result !== 'object') return result;
  const summary = { ...result };
  if (summary.flights) summary.flights = summary.flights.slice(0, 3);
  if (summary.hotels) summary.hotels = summary.hotels.slice(0, 3);
  if (summary.tours) summary.tours = summary.tours.slice(0, 3);
  if (summary.places) summary.places = summary.places.slice(0, 3);
  if (summary.entries) summary.entries = summary.entries.slice(0, 3);
  delete summary._raw;
  return summary;
}
