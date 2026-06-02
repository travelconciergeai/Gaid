const PLAN_SYSTEM_PROMPT = `
Voce e a Gaid, uma concierge de viagens premium para usuarios brasileiros.
Gere um roteiro de viagem estruturado para alimentar uma interface visual.
Retorne SOMENTE JSON valido. Nao retorne markdown, comentarios, texto fora do JSON, blocos de codigo ou explicacoes.
Nao invente reservas, disponibilidade real, precos exatos, hoteis confirmados, voos confirmados ou integracoes.
Use null quando uma informacao nao foi fornecida.
Use portugues do Brasil nos textos visiveis.
O JSON deve seguir exatamente este formato:
{
  "trip": {
    "title": "string",
    "destination": "string",
    "status": "planning",
    "blurb": "string",
    "dates": { "start": "YYYY-MM-DD or null", "end": "YYYY-MM-DD or null", "label": "string" },
    "nights": "number or null",
    "travelers": { "count": "number or null", "composition": "string" },
    "budget": { "currency": "BRL", "min": "number or null", "max": "number or null", "label": "string" },
    "cover": { "tone": "string", "label": "string" },
    "progress": 0
  },
  "insights": [{ "kind": "tip | benefit | miles | other", "text": "string" }],
  "days": [{
    "day_number": "number",
    "date": "YYYY-MM-DD or null",
    "date_label": "string",
    "city": "string",
    "has_flight": "boolean",
    "items": [{
      "slot": "manhã | tarde | noite",
      "title": "string",
      "place": "string",
      "duration": "string",
      "tag": "string",
      "vibe": "string",
      "confirmed": false,
      "notes": "string"
    }]
  }]
}
`.trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ source: 'error', detail: 'Metodo nao permitido.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/plan] Missing OPENAI_API_KEY');
    return res.status(503).json({
      source: 'missing-key',
      detail: 'OPENAI_API_KEY ausente.',
      data: normalizePlan({}),
    });
  }

  const { prompt, tripId = null, context = {} } = req.body || {};
  const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  if (!cleanPrompt) {
    return res.status(400).json({ source: 'error', detail: 'prompt e obrigatorio.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.2',
        instructions: `${PLAN_SYSTEM_PROMPT}\n\nContexto adicional: ${JSON.stringify({ tripId, context }).slice(0, 2000)}`,
        input: [
          {
            role: 'user',
            content: `Prompt de planejamento: ${cleanPrompt}`,
          },
        ],
        max_output_tokens: 2500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const detail = data?.error?.message || data?.error || data;
      console.error('[api/plan] OpenAI non-OK response', { status: response.status, detail });
      return res.status(502).json({ source: 'openai-error', detail });
    }

    const text = extractResponseText(data);
    if (!text) {
      return res.status(502).json({
        source: 'parse-error',
        detail: 'Resposta da OpenAI sem texto JSON.',
        raw: data,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch (error) {
      console.error('[api/plan] JSON parse failed', error);
      return res.status(502).json({
        source: 'parse-error',
        detail: error?.message || String(error),
        raw: text,
      });
    }

    return res.status(200).json({
      source: 'openai',
      data: normalizePlan(parsed),
    });
  } catch (error) {
    const detail = error?.message || String(error);
    console.error('[api/plan] Handler error', error);
    return res.status(500).json({ source: 'server-error', detail });
  }
}

function extractResponseText(data) {
  return data?.output_text ||
    data?.output
      ?.flatMap(item => item.content || [])
      ?.find(content => content.type === 'output_text')
      ?.text ||
    '';
}

function stripJsonFences(text) {
  return String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asDateOrNull(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizePlan(value) {
  const root = asObject(value);
  const trip = asObject(root.trip);
  const dates = asObject(trip.dates);
  const travelers = asObject(trip.travelers);
  const budget = asObject(trip.budget);
  const cover = asObject(trip.cover);

  return {
    trip: {
      title: asString(trip.title, 'Nova viagem'),
      destination: asString(trip.destination),
      status: 'planning',
      blurb: asString(trip.blurb),
      dates: {
        start: asDateOrNull(dates.start),
        end: asDateOrNull(dates.end),
        label: asString(dates.label),
      },
      nights: asNumberOrNull(trip.nights),
      travelers: {
        count: asNumberOrNull(travelers.count),
        composition: asString(travelers.composition),
      },
      budget: {
        currency: 'BRL',
        min: asNumberOrNull(budget.min),
        max: asNumberOrNull(budget.max),
        label: asString(budget.label),
      },
      cover: {
        tone: asString(cover.tone, 'warm'),
        label: asString(cover.label, asString(trip.destination)),
      },
      progress: 0,
    },
    insights: normalizeInsights(root.insights),
    days: normalizeDays(root.days),
  };
}

function normalizeInsights(value) {
  const allowed = new Set(['tip', 'benefit', 'miles', 'other']);
  return Array.isArray(value)
    ? value
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => ({
        kind: allowed.has(item.kind) ? item.kind : 'other',
        text: asString(item.text),
      }))
      .filter(item => item.text)
    : [];
}

function normalizeDays(value) {
  return Array.isArray(value)
    ? value
      .filter(day => day && typeof day === 'object' && !Array.isArray(day))
      .map((day, index) => ({
        day_number: asNumberOrNull(day.day_number) || index + 1,
        date: asDateOrNull(day.date),
        date_label: asString(day.date_label),
        city: asString(day.city),
        has_flight: Boolean(day.has_flight),
        items: normalizeItems(day.items),
      }))
    : [];
}

function normalizeItems(value) {
  const allowedSlots = new Set(['manhã', 'tarde', 'noite']);
  return Array.isArray(value)
    ? value
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => ({
        slot: allowedSlots.has(item.slot) ? item.slot : 'manhã',
        title: asString(item.title),
        place: asString(item.place),
        duration: asString(item.duration),
        tag: asString(item.tag, 'item'),
        vibe: asString(item.vibe),
        confirmed: false,
        notes: asString(item.notes),
      }))
      .filter(item => item.title)
    : [];
}
