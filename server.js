const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;

const ENV_TOKEN   = process.env.INSTAGRAM_TOKEN   || '';
const ENV_USER_ID = process.env.INSTAGRAM_USER_ID || '';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    res.end(data);
  });
}

const GRAPH_HOST = 'graph.instagram.com';
const GRAPH_IP = '57.144.66.192';

function fetchUrl(url, callback) {
  const parsed = new URL(url);
  const useDirectIp = parsed.hostname === GRAPH_HOST;

  const options = useDirectIp ? {
    hostname: GRAPH_IP,
    port: 443,
    path: parsed.pathname + parsed.search,
    headers: { Host: GRAPH_HOST },
    servername: GRAPH_HOST,
  } : undefined;

  const target = useDirectIp ? options : url;
  const handler = (apiRes) => {
    if (apiRes.statusCode >= 300 && apiRes.statusCode < 400 && apiRes.headers.location) {
      fetchUrl(apiRes.headers.location, callback);
      return;
    }
    let body = '';
    apiRes.on('data', (chunk) => { body += chunk; });
    apiRes.on('end', () => callback(null, apiRes.statusCode, body));
  };

  (useDirectIp ? https.get(target, handler) : https.get(url, handler))
    .on('error', (err) => callback(err));
}

function proxyToGraph(req, res) {
  const qsStart = req.url.indexOf('?');
  const params = new URLSearchParams(qsStart >= 0 ? req.url.slice(qsStart + 1) : '');

  const apiPath = params.get('apiPath') || req.url.slice('/api'.length).split('?')[0];
  params.delete('apiPath');

  if (ENV_TOKEN) params.set('access_token', ENV_TOKEN);

  const graphUrl = 'https://graph.instagram.com' + apiPath + '?' + params.toString();
  console.log('[proxy]', graphUrl.split('access_token')[0] + '...');

  fetchUrl(graphUrl, (err, statusCode, body) => {
    if (err) {
      console.log('[proxy] error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: err.message } }));
      return;
    }

    console.log('[proxy] status:', statusCode, '| bytes:', body.length);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  });
}

const server = http.createServer((req, res) => {
  // Env config endpoint — tells the client if the server already has credentials
  if (req.url === '/env-config' || req.url === '/api/env-config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      configured: Boolean(ENV_TOKEN && ENV_USER_ID),
      userId: ENV_USER_ID || null,
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    }));
    return;
  }

  if (req.url.startsWith('/api/avatar?')) {
    const avatar = require('./api/avatar');
    avatar(req, res);
    return;
  }

  if (req.url === '/api/analyze' && req.method === 'POST') {
    const analyze = require('./api/analyze');
    analyze(req, res);
    return;
  }

  if (req.url.startsWith('/api/')) {
    proxyToGraph(req, res);
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath.split('?')[0]);
  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  const mode = ENV_TOKEN ? 'env token ativo' : 'modo wizard (token via browser)';
  console.log(`Dashboard rodando em http://localhost:${PORT} — ${mode}`);
});
