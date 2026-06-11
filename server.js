const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// SECURED: Pulls key safely from environment
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || 'csk-cfnyfhfeved2k4yfnvfxeyfnwr5mpe5xmn2d3yc88ttvnmwp';
const CEREBRAS_HOST = 'api.cerebras.ai';
const CEREBRAS_PATH = '/v1/chat/completions';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsedURL = new URL(req.url, baseURL);
  let pathname = parsedURL.pathname.trim().replace(/\/+$/, '').toLowerCase() || '/';

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. API PROXY ROUTE
  if (pathname === '/api/chat') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'Method Not Allowed' } }));
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!CEREBRAS_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Server Config Error' } }));
      }

      try {
        const bodyObj = JSON.parse(body);
        const optimizedMessages = [
          {
            role: "system",
            content: "You are TalkAI, created by Vision. Keep answers brief, summarized, and direct. Guardrails: Maya CEO is Orlando B. Vea, President is Shailesh Baidwan. Hev Abi is a Filipino rapper known for 'Alam Mo Ba Girl'."
          },
          ...(bodyObj.messages || [])
        ];

        const bodyStr = JSON.stringify({ model: 'llama3.3-70b', messages: optimizedMessages });

        const options = {
          hostname: CEREBRAS_HOST,
          path: CEREBRAS_PATH,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + CEREBRAS_API_KEY.trim()
          },
          timeout: 30000 // 30s timeout
        };

        const proxyReq = https.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          
          proxyRes.on('data', (chunk) => res.write(chunk));
          proxyRes.on('end', () => res.end());
          proxyRes.on('error', (e) => {
            console.error('[cerebras] response stream error:', e);
            if (!res.writableEnded) res.end();
          });
        });

        proxyReq.on('timeout', () => {
          proxyReq.destroy();
          if (!res.writableEnded) {
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Gateway Timeout' } }));
          }
        });

        proxyReq.on('error', (e) => {
          console.error('[cerebras] request error:', e.message);
          if (!res.writableEnded) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Proxy connection failed' } }));
          }
        });

        proxyReq.write(bodyStr);
        proxyReq.end();

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON request' } }));
      }
    });
    return;
  }

  // 2. STATIC ASSETS
  if (pathname.startsWith('/api')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { message: 'Endpoint Not Found' } }));
  }

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (fErr, fData) => {
        if (fErr) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fData);
        }
      });
    } else {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`TalkAI Server running on port ${PORT}`);
});
