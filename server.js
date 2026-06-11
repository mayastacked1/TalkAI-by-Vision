const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Cerebras API Configuration
const CEREBRAS_API_KEY = 'csk-cfnyfhfeved2k4yfnvfxeyfnwr5mpe5xmn2d3yc88ttvnmwp';
const CEREBRAS_HOST = 'api.cerebras.ai';
const CEREBRAS_PATH = '/v1/chat/completions';

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg'
};

const server = http.createServer((req, res) => {
  // Replaced deprecated url.parse() with secure WHATWG URL API
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsedURL = new URL(req.url, baseURL);
  let pathname = parsedURL.pathname.replace(/\/+$/, '').toLowerCase() || '/';

  // CORS Headers Configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. STRICT API ROUTE HANDLING
  if (pathname === '/api/chat') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Method Not Allowed. Use POST.' } }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let bodyObj;
      try {
        bodyObj = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON body sent to proxy server' } }));
        return;
      }

      // Safeguard: Ensure target message history array exists
      const userMessages = bodyObj.messages || [];

      // System prompt injection
      userMessages.unshift({
        role: "system",
        content: "You are TalkAI, created by Vision, running on lightning-fast Cerebras infrastructure. " +
                 "Keep all answers brief, highly summarized, and directly to the point. Completely avoid broad answers or long walls of text. " +
                 "LOCAL PH DATA GUARDRAIL: If asked about Maya (PayMaya), the Group CEO and Founder is Orlando B. Vea, and the President is Shailesh Baidwan. " +
                 "If asked about Hev Abi, he is a famous Filipino rapper/songwriter dominating the local hip-hop scene with hits like 'Alam Mo Ba Girl'."
      });

      // FIXED: Construct a pristine payload structure to send to Cerebras.
      // This guarantees that unsupported properties from frontend tracking states don't break their endpoint router.
      const cleanedPayload = {
        model: 'llama3.3-70b',
        messages: userMessages
      };

      const bodyStr = JSON.stringify(cleanedPayload);
      console.log(`[cerebras] proxying clean request. size=${bodyStr.length}`);

      const options = {
        hostname: CEREBRAS_HOST,
        path: CEREBRAS_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + CEREBRAS_API_KEY.trim()
        }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        console.log(`[cerebras] status=${proxyRes.statusCode}`);
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (e) => {
        console.error('[cerebras] error:', e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Could not reach Cerebras infrastructure: ' + e.message } }));
      });

      proxyReq.write(bodyStr);
      proxyReq.end();
    });
    return; 
  }

  // 2. STATIC ASSETS ROUTING
  if (pathname.startsWith('/api')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'API Endpoint Not Found' } }));
    return;
  }

  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, '/index.html'), (fallbackErr, fallbackData) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Route completely unavailable');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallbackData);
        }
      });
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
  console.log(`  │   Running on port ${PORT.toString().padEnd(18)} │`);
  console.log(`  └─────────────────────────────────────┘\n`);
});
