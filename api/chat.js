const SYSTEM_PROMPT = `
Voce e a Voia, copilot premium de viagens para usuarios brasileiros.

Sua expertise vem do cerebro Voia — conhecimento curado por experts que viajaram o mundo e compartilham experiencias reais.

Sua voz:
- humana, calorosa, segura e objetiva
- sofisticada sem soar formal demais
- parecida com uma consultora de viagens experiente, nao com um relatorio de IA

Como responder:
- escreva em portugues do Brasil
- prefira conversa curta a blocos longos
- evite markdown pesado
- nao use titulos com ### ou markdown de heading
- evite negrito com **
- evite listas grandes
- use no maximo 3 bullets quando realmente ajudar
- evite numeracao excessiva
- faca perguntas de forma natural, uma ou duas por vez
- se faltar informacao, peca o proximo dado mais importante

O que fazer:
- ajude a descobrir destino, datas, companhia, preferencias, orcamento e proximos passos
- sugira caminhos de viagem com bom senso de concierge
- seja especifica o suficiente para ser util, mas sem parecer um planejamento final quando ainda faltarem dados

Limites:
- nao invente reservas confirmadas
- nao invente precos, disponibilidade, hoteis, voos ou integracoes
- nao diga que consultou sistemas externos se isso nao aconteceu
- quando algo depender de backend, disponibilidade ou parceiro, explique de forma simples que ainda precisa ser confirmado

Estilo ideal:
Responda como uma mensagem de chat. Curta, natural e acionavel.

Formato tecnico obrigatorio:
- Retorne somente JSON valido, sem markdown e sem texto fora do JSON.
- Use esta forma:
{
  "text": "mensagem natural para aparecer no chat",
  "itinerarySuggestions": [
    {
      "day": 1,
      "slot": "manhã",
      "title": "string",
      "place": "string",
      "dur": "string",
      "tag": "string",
      "vibe": "string"
    }
  ]
}
- O campo text e obrigatorio.
- Inclua itinerarySuggestions somente quando o usuario pedir roteiro, atividades, plano por dia, ou disser aplicar/adicionar ao roteiro, e voce tiver sugestoes concretas.
- Se nao tiver certeza do dia ou periodo, nao inclua itinerarySuggestions.
- Quando Contexto da tela indicar initialItinerary true, itinerarySuggestions e obrigatorio: crie 1 item principal por periodo para cada dia solicitado.
- Para initialItinerary, use exatamente os dias indicados em itineraryDays e gere 3 itens por dia: manhã, tarde e noite.
- Cada item de itinerarySuggestions deve ter day, slot, title, place, dur, tag e vibe.
- Use slot apenas como "manhã", "tarde" ou "noite".
- Nao invente reservas confirmadas.
`.trim();

const fallbackText = 'Ainda nao estou conectada a OpenAI aqui, mas posso continuar te ajudando: me diga destino, datas e quem vai viajar.';

function stripJsonFences(value = '') {
  return String(value)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseAssistantPayload(rawText) {
  const cleaned = stripJsonFences(rawText);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch (_error) {
    return null;
  }
  return null;
}

function extractTextFromRawJson(value) {
  const cleaned = stripJsonFences(value);
  const match = cleaned.match(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (!match) return '';
  try {
    return JSON.parse(`"${match[1]}"`).trim();
  } catch (_error) {
    return match[1].trim();
  }
}

function normalizeSlot(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'manha') return 'manhã';
  if (['manhã', 'tarde', 'noite'].includes(text)) return text;
  return null;
}

function normalizeItinerarySuggestion(item, { allowPartialPlacement = false } = {}) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const day = Number(item.day);
  const slot = normalizeSlot(item.slot);
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) return null;
  if (!allowPartialPlacement && (!Number.isFinite(day) || day < 1 || !slot)) return null;
  return {
    day: Number.isFinite(day) && day >= 1 ? Math.floor(day) : null,
    slot,
    title,
    place: typeof item.place === 'string' && item.place.trim() ? item.place.trim() : 'A definir',
    dur: typeof item.dur === 'string' && item.dur.trim() ? item.dur.trim() : 'A definir',
    tag: typeof item.tag === 'string' && item.tag.trim() ? item.tag.trim() : 'item',
    vibe: typeof item.vibe === 'string' && item.vibe.trim() ? item.vibe.trim() : '',
  };
}

function suggestionLimitForContext(context = {}) {
  const days = Number(context.itineraryDays);
  if (context.initialItinerary === true && Number.isFinite(days) && days > 0) {
    return Math.min(Math.floor(days) * 3, 45);
  }
  return 12;
}

function normalizeItinerarySuggestions(value, options = {}) {
  if (!Array.isArray(value)) return [];
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : 12;
  return value.map(item => normalizeItinerarySuggestion(item, options)).filter(Boolean).slice(0, limit);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ text: 'Metodo nao permitido.', source: 'error' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/chat] Missing OPENAI_API_KEY');
    return res.status(503).json({ text: fallbackText, source: 'missing-key' });
  }

  const { message, history = [], context = {} } = req.body || {};
  const cleanMessage = typeof message === 'string' ? message.trim() : '';

  if (!cleanMessage) {
    return res.status(400).json({ text: 'Me mande uma mensagem para eu conseguir ajudar.', source: 'error' });
  }

  const input = [
    ...history.slice(-8).map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.text || '').slice(0, 1200),
    })),
    {
      role: 'user',
      content: cleanMessage,
    },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.2',
        instructions: `${SYSTEM_PROMPT}\n\nContexto da tela: ${JSON.stringify(context).slice(0, 1200)}`,
        input,
        max_output_tokens: context?.initialItinerary === true ? 5000 : 900,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data?.error?.message || data?.error || data;
      console.error('[api/chat] OpenAI non-OK response', {
        status: response.status,
        detail,
      });
      return res.status(502).json({
        text: 'A Voia ficou indisponivel por um instante. Tente novamente em alguns segundos.',
        source: 'openai-error',
        detail,
      });
    }

    const rawText =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        ?.find(content => content.type === 'output_text')
        ?.text;

    if (!rawText) {
      return res.status(502).json({
        text: 'Não consegui obter uma resposta da IA agora. Tente novamente em instantes.',
        source: 'openai-error',
        detail: data,
      });
    }

    const isInitialItinerary = context?.initialItinerary === true;
    const parsedPayload = parseAssistantPayload(rawText);
    const text = typeof parsedPayload?.text === 'string' && parsedPayload.text.trim()
      ? parsedPayload.text.trim()
      : extractTextFromRawJson(rawText) || 'Criei a estrutura dos dias do roteiro. Me peça para montar uma primeira versão quando quiser.';
    const itinerarySuggestions = parsedPayload
      ? normalizeItinerarySuggestions(parsedPayload.itinerarySuggestions, {
        allowPartialPlacement: isInitialItinerary,
        limit: suggestionLimitForContext(context),
      })
      : [];

    const payload = {
      text,
      source: 'openai',
    };
    if (itinerarySuggestions.length > 0) {
      payload.itinerarySuggestions = itinerarySuggestions;
    }
    return res.status(200).json(payload);
  } catch (error) {
    const detail = error?.message || String(error);
    console.error('[api/chat] Handler error', error);
    return res.status(500).json({
      text: 'Nao consegui responder agora. Tente novamente em instantes.',
      source: 'server-error',
      detail,
    });
  }
}
