const SYSTEM_PROMPT = `
Voce e a Gaid, uma concierge de viagens premium para usuarios brasileiros.
Responda em portugues do Brasil, com tom calmo, direto e sofisticado.
Ajude a descobrir destino, datas, companhia, preferencias, orcamento e proximos passos.
Nao invente reservas, precos, disponibilidade, hoteis, voos ou integracoes.
Quando faltar informacao, faca uma pergunta objetiva para avancar o planejamento.
`.trim();

const fallbackText = 'Ainda nao estou conectada a OpenAI aqui, mas posso continuar te ajudando: me diga destino, datas e quem vai viajar.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ text: 'Metodo nao permitido.', source: 'error' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ text: fallbackText, source: 'missing-key' });
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
      return res.status(200).json({
        text: 'A Gaid ficou indisponivel por um instante. Tente novamente em alguns segundos.',
        source: 'error',
      });
    }

    return res.status(200).json({
      text: data.output_text || 'Estou aqui. Me conte um pouco mais sobre a viagem que voce quer planejar.',
      source: 'openai',
    });
  } catch (_error) {
    return res.status(200).json({
      text: 'Nao consegui responder agora. Tente novamente em instantes.',
      source: 'error',
    });
  }
}
