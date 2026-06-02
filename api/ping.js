export default function handler(_req, res) {
  return res.status(200).json({
    ok: true,
    source: 'vercel-api',
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    timestamp: new Date().toISOString(),
  });
}
