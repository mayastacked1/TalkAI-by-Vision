const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY; 
const CEREBRAS_HOST = 'api.cerebras.ai';
const CEREBRAS_PATH = '/v1/chat/completions';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const parsedURL = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedURL.pathname.toLowerCase();

  // 1. API PROXY ROUTE
  if (pathname === '/api/chat') {
    // ... (Keep your existing API Proxy logic here) ...
    return;
  }

  // 2. IMPROVED STATIC ASSETS ROUTING
  // Protect against directory traversal attacks
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath === '/' ? 'index.html' : safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Only return index.html for root or missing routes (SPA behavior)
      if (pathname === '/' || pathname === '/index.html') {
          serveFile(path.join(__dirname, 'index.html'), '.html', res);
      } else {
          res.writeHead(404);
          res.end('404 Not Found');
      }
      return;
    }
    
    const ext = path.extname(filePath);
    serveFile(filePath, ext, res);
  });
});

function serveFile(filePath, ext, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    }
  });
}

server.listen(PORT, () => console.log(`Server running on ${PORT}`));
