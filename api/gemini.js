const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'gemini-proxy',
      model: GEMINI_MODEL,
      keyConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { prompt, temperature = 0.3, maxTokens = 4096 } = body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }

  if (prompt.length > 120000) {
    return res.status(413).json({ error: 'Prompt too large' });
  }

  try {
    const upstream = await fetch(`${GEMINI_BASE}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: Math.min(1, Math.max(0, Number(temperature) || 0.3)),
          maxOutputTokens: Math.min(8192, Math.max(256, Number(maxTokens) || 4096)),
        },
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const message = data?.error?.message || `Gemini API error ${upstream.status}`;
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Upstream request failed' });
  }
};
