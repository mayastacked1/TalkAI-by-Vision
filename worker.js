// TalkAI by Vision — Cloudflare Worker Proxy
// Deploy this at: https://workers.cloudflare.com (free, no credit card)
// Then replace YOUR-SUBDOMAIN in talkai.html with your actual worker URL

const GROQ_API_KEY = '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'; // ← replace before publishing
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    try {
      const body = await request.json();

      const groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const data = await groqRes.json();

      return new Response(JSON.stringify(data), {
        status: groqRes.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: { message: err.message } }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }
};
