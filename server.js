const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Hardcoded to ensure Render dashboard variables don't accidentally overwrite with your old Groq key
const CEREBRAS_API_KEY = 'csk-cfnyfhfeved2k4yfnvfxeyfnwr5mpe5xmn2d3yc88ttvnmwp';
const CEREBRAS_HOST = 'api.cerebras.ai';
const CEREBRAS_PATH = '/v1/chat/completions';

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
      let bodyObj;
      try {
        bodyObj = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON body' } }));
        return;
      }

      // Seamlessly transition the model name if the frontend requests a legacy Groq string
      if (bodyObj.model && (bodyObj.model.includes('groq') || bodyObj.model === 'llama-3.3-70b-versatile')) {
        bodyObj.model = 'llama-3.3-70b';
      }

      const bodyStr = JSON.stringify(bodyObj);
      console.log(`[cerebras] proxying request. size=${bodyStr.length}`);

      const options = {
        hostname: CEREBRAS_HOST,
        path: CEREBRAS_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + CEREBRAS_API_KEY
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
        res.end(JSON.stringify({ error: { message: 'Could not reach Cerebras: ' + e.message } }));
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
  console.log(`  │   Running on port ${PORT.toString().padEnd(18)} │`);
  console.log(`  └─────────────────────────────────────┘\n`);
});
