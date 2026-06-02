const SYSTEM_PROMPT = `
Voce e a Gaid, uma concierge premium de viagens para usuarios brasileiros.

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
`.trim();

const fallbackText = 'Ainda nao estou conectada a OpenAI aqui, mas posso continuar te ajudando: me diga destino, datas e quem vai viajar.';

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
        max_output_tokens: 500,
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
        text: 'A Gaid ficou indisponivel por um instante. Tente novamente em alguns segundos.',
        source: 'openai-error',
        detail,
      });
    }

    const text =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        ?.find(content => content.type === 'output_text')
        ?.text;

    if (!text) {
      return res.status(502).json({
        text: 'Não consegui obter uma resposta da IA agora. Tente novamente em instantes.',
        source: 'openai-error',
        detail: data,
      });
    }

    return res.status(200).json({
      text,
      source: 'openai',
    });
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
