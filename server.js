const http = require('http'), fs = require('fs'), path = require('path');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain'};

const https = require('https');
const UP = 'https://books.streamfiles.eu.org';
function proxy(req, res, apiPath) {
  const q = req.url.split('?').slice(1).join('?');
  const url = UP + '/api/' + apiPath + (q ? '?' + q : '');
  const u = new URL(url);
  const opts = { hostname: u.hostname, path: u.pathname + u.search, headers: {
    'Origin': 'https://books.pw.live', 'Referer': 'https://books.pw.live/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
    'Accept': '*/*'
  }};
  const rq = https.get(opts, (ur) => {
    res.writeHead(ur.statusCode || 502, {
      'Content-Type': ur.headers['content-type'] || 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    ur.pipe(res);
  });
  rq.setTimeout(30000, () => { rq.destroy(); try { res.writeHead(504, {'Content-Type':'text/plain'}); res.end('upstream timeout'); } catch(e){} });
  rq.on('error', () => { try { res.writeHead(502, {'Content-Type':'text/plain'}); res.end('upstream error'); } catch(e){} });
}

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/api/' + decodeURIComponent('').slice(0)) {}
  if (p.startsWith('/api/')) { proxy(req, res, p.slice(5)); return; }
  if (p === '/') p = '/index.html';
  const f = path.join(__dirname, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404, {'Content-Type': 'text/plain'}); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
    res.end(d);
  });
}).listen(process.env.PORT || 3000);
console.log('listening on ' + (process.env.PORT || 3000));
