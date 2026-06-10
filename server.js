const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API Proxy: POST /api/chat ──
  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON: ' + e.message } }));
        return;
      }

      // Accept key from env, or from any casing of x-api-key header
      const clientKey = req.headers['x-api-key'] || req.headers['X-Api-Key'] || req.headers['authorization']?.replace('Bearer ', '') || '';
      const apiKey = GROQ_API_KEY || clientKey;

      console.log(`[chat] model=${payload.model} msgs=${payload.messages?.length} keyLen=${apiKey.length}`);

      if (!apiKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'No API key. Add it in Settings → API Key.' } }));
        return;
      }

      const bodyStr = JSON.stringify(payload);
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      };

      const proxyReq = https.request(options, (proxyRes) => {
        console.log(`[groq] status=${proxyRes.statusCode}`);
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (e) => {
        console.error('[groq] error:', e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Could not reach Groq: ' + e.message } }));
      });

      proxyReq.write(bodyStr);
      proxyReq.end();
    });
    return;
  }

  // ── Static files ──
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ┌─────────────────────────────────────┐`);
  console.log(`  │   TalkAI by Vision                  │`);
  console.log(`  │   Running at http://localhost:${PORT}   │`);
  console.log(`  └─────────────────────────────────────┘\n`);
  if (!GROQ_API_KEY) {
    console.log('  ⚠  No GROQ_API_KEY env var — users must enter key in Settings.\n');
  } else {
    console.log('  ✓  Groq API key loaded from environment.\n');
  }
});
