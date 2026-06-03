const WIZARD_SYSTEM_PROMPT = `
Voce e a Gaid, uma concierge premium de viagens para usuarios brasileiros.
Sua tarefa e decidir a proxima melhor pergunta de descoberta para montar a base de um roteiro.

Retorne SOMENTE JSON valido. Nao retorne markdown, comentarios, texto fora do JSON, blocos de codigo ou explicacoes.
Mantenha a resposta pequena.

Campos permitidos:
destination | period | duration | travelers | childrenAges | budget | stylePace | origin | priorities | notes

Regras:
- aja como uma consultora de viagens experiente
- escolha a proxima pergunta mais util, nao uma pergunta generica
- nao repita campos que ja estejam claros em answers ou normalizedPatch
- Never ask again for information already clearly present in answers or normalized context.
- faca no maximo uma pergunta por resposta
- retorne 2 a 4 opcoes curtas
- allowFreeText deve ser true salvo quando isComplete for true
- maximo de 8 perguntas
- se stepCount >= 8, retorne isComplete true com o melhor normalizedPatch possivel

Conclusao exige:
- destino conhecido
- data ou periodo conhecido
- duracao conhecida
- viajantes/composicao conhecidos
- orcamento conhecido
- ao menos uma preferencia/prioridade conhecida

Formato obrigatorio:
{
  "question": "string",
  "field": "destination | period | duration | travelers | childrenAges | budget | stylePace | origin | priorities | notes",
  "options": [
    { "id": "string", "label": "string" }
  ],
  "allowFreeText": true,
  "isComplete": false,
  "normalizedPatch": {}
}
`.trim();

const ALLOWED_FIELDS = new Set([
  'destination',
  'period',
  'duration',
  'travelers',
  'childrenAges',
  'budget',
  'stylePace',
  'origin',
  'priorities',
  'notes',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ source: 'error', detail: 'Metodo nao permitido.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/wizard-next] Missing OPENAI_API_KEY');
    return res.status(503).json({ source: 'missing-key', detail: 'OPENAI_API_KEY ausente.' });
  }

  const body = normalizeRequest(req.body || {});
  if (!body.prompt && Object.keys(body.answers).length === 0) {
    return res.status(400).json({ source: 'error', detail: 'prompt ou answers e obrigatorio.' });
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
        instructions: WIZARD_SYSTEM_PROMPT,
        input: [
          {
            role: 'user',
            content: JSON.stringify(body),
          },
        ],
        max_output_tokens: 700,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const detail = data?.error?.message || data?.error || data;
      console.error('[api/wizard-next] OpenAI non-OK response', { status: response.status, detail });
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
      console.error('[api/wizard-next] JSON parse failed', error);
      return res.status(502).json({ source: 'parse-error', detail: error?.message || String(error), raw: text });
    }

    return res.status(200).json(normalizeWizardResponse(parsed, body.stepCount));
  } catch (error) {
    const detail = error?.message || String(error);
    console.error('[api/wizard-next] Handler error', error);
    return res.status(500).json({ source: 'server-error', detail });
  }
}

function normalizeRequest(value) {
  const root = asObject(value);
  return {
    prompt: asString(root.prompt).trim().slice(0, 1600),
    answers: asObject(root.answers),
    context: asObject(root.context),
    lastAnswer: normalizeLastAnswer(root.lastAnswer),
    stepCount: clampStepCount(root.stepCount),
  };
}

function normalizeLastAnswer(value) {
  const answer = asObject(value);
  return {
    field: asString(answer.field).slice(0, 80),
    value: asString(answer.value).slice(0, 300),
    label: asString(answer.label).slice(0, 300),
  };
}

function normalizeWizardResponse(value, stepCount) {
  const root = asObject(value);
  const isComplete = stepCount >= 8 || root.isComplete === true;
  const field = ALLOWED_FIELDS.has(root.field) ? root.field : 'notes';
  const options = Array.isArray(root.options)
    ? root.options
      .map(normalizeOption)
      .filter(Boolean)
      .slice(0, 4)
    : [];

  return {
    question: isComplete ? '' : asString(root.question).slice(0, 300),
    field,
    options: isComplete ? [] : options,
    allowFreeText: isComplete ? false : root.allowFreeText !== false,
    isComplete,
    normalizedPatch: asObject(root.normalizedPatch),
  };
}

function normalizeOption(value) {
  const option = asObject(value);
  const label = asString(option.label).trim();
  if (!label) return null;
  const id = asString(option.id, label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return {
    id: id || label.slice(0, 40),
    label: label.slice(0, 80),
  };
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

function clampStepCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.min(Math.floor(count), 8);
}
