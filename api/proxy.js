const https = require('https');

function fetchUrl(url, callback) {
  https.get(url, (apiRes) => {
    if (apiRes.statusCode >= 300 && apiRes.statusCode < 400 && apiRes.headers.location) {
      fetchUrl(apiRes.headers.location, callback);
      return;
    }
    let body = '';
    apiRes.on('data', (chunk) => { body += chunk; });
    apiRes.on('end', () => callback(null, apiRes.statusCode, body));
  }).on('error', (err) => callback(err));
}

module.exports = (req, res) => {
  const raw = req.url || '';
  const sepIdx = raw.indexOf('?');
  const params = new URLSearchParams(sepIdx >= 0 ? raw.slice(sepIdx + 1) : '');

  const apiPath = params.get('apiPath') || (sepIdx >= 0 ? raw.slice(0, sepIdx) : raw);
  params.delete('apiPath');

  const envToken = process.env.INSTAGRAM_TOKEN;
  if (envToken) params.set('access_token', envToken);

  const graphUrl = 'https://graph.instagram.com' + apiPath + '?' + params.toString();
  console.log('[proxy]', graphUrl.split('access_token')[0] + '...');

  fetchUrl(graphUrl, (err, statusCode, body) => {
    if (err) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { message: err.message } }));
      return;
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(body);
  });
};
