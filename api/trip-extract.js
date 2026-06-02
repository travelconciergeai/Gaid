const EXTRACT_SYSTEM_PROMPT = `
Voce e a Gaid, uma concierge de viagens premium para usuarios brasileiros.
Extraia apenas o estado inicial de uma viagem a partir da mensagem do usuario.
Retorne SOMENTE JSON valido. Nao retorne markdown, comentarios, texto fora do JSON, blocos de codigo ou explicacoes.
Nao gere roteiro, dias, atividades, hoteis, voos, reservas ou sugestoes.
Use null quando a informacao nao estiver clara.
Use "A definir" para labels ausentes.

Formato obrigatorio:
{
  "destination": "string or null",
  "title": "string",
  "travelers": {
    "count": "number or null",
    "composition": "string"
  },
  "dates": {
    "start": "YYYY-MM-DD or null",
    "end": "YYYY-MM-DD or null",
    "label": "string"
  },
  "nights": "number or null",
  "budget": {
    "currency": "BRL",
    "min": "number or null",
    "max": "number or null",
    "label": "string"
  },
  "intent": "create_itinerary | ask_clarifying_question | unknown",
  "confidence": "low | medium | high"
}
`.trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ source: 'error', detail: 'Metodo nao permitido.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/trip-extract] Missing OPENAI_API_KEY');
    return res.status(503).json({ source: 'missing-key', detail: 'OPENAI_API_KEY ausente.' });
  }

  const { prompt } = req.body || {};
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
        instructions: EXTRACT_SYSTEM_PROMPT,
        input: [
          {
            role: 'user',
            content: cleanPrompt,
          },
        ],
        max_output_tokens: 600,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const detail = data?.error?.message || data?.error || data;
      console.error('[api/trip-extract] OpenAI non-OK response', { status: response.status, detail });
      return res.status(502).json({ source: 'openai-error', detail });
    }

    const text = extractResponseText(data);
    if (!text) {
      return res.status(502).json({ source: 'parse-error', detail: 'Resposta da OpenAI sem texto JSON.', raw: data });
    }

    let parsed;
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch (error) {
      console.error('[api/trip-extract] JSON parse failed', error);
      return res.status(502).json({ source: 'parse-error', detail: error?.message || String(error), raw: text });
    }

    return res.status(200).json(normalizeExtraction(parsed));
  } catch (error) {
    const detail = error?.message || String(error);
    console.error('[api/trip-extract] Handler error', error);
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

function normalizeExtraction(value) {
  const root = asObject(value);
  const travelers = asObject(root.travelers);
  const dates = asObject(root.dates);
  const budget = asObject(root.budget);
  const destination = asString(root.destination) || null;
  return {
    destination,
    title: asString(root.title, destination ? `Roteiro para ${destination}` : 'Nova viagem'),
    travelers: {
      count: asNumberOrNull(travelers.count),
      composition: asString(travelers.composition),
    },
    dates: {
      start: asDateOrNull(dates.start),
      end: asDateOrNull(dates.end),
      label: asString(dates.label, 'A definir'),
    },
    nights: asNumberOrNull(root.nights),
    budget: {
      currency: 'BRL',
      min: asNumberOrNull(budget.min),
      max: asNumberOrNull(budget.max),
      label: asString(budget.label, 'A definir'),
    },
    intent: ['create_itinerary', 'ask_clarifying_question', 'unknown'].includes(root.intent) ? root.intent : 'unknown',
    confidence: ['low', 'medium', 'high'].includes(root.confidence) ? root.confidence : 'low',
  };
}
