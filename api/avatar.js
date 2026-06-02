const https = require('https');

function fetchImage(url, callback) {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      fetchImage(res.headers.location, callback);
      return;
    }
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => callback(null, res.statusCode, Buffer.concat(chunks), res.headers['content-type']));
  }).on('error', (err) => callback(err));
}

module.exports = (req, res) => {
  const url = req.query?.url || new URL(req.url, 'http://localhost').searchParams.get('url');
  if (!url || !url.startsWith('https://')) {
    res.statusCode = 400;
    res.end('Missing or invalid url parameter');
    return;
  }

  fetchImage(url, (err, statusCode, body, contentType) => {
    if (err) {
      res.statusCode = 502;
      res.end('Failed to fetch image');
      return;
    }
    res.writeHead(statusCode, {
      'Content-Type': contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  });
};
