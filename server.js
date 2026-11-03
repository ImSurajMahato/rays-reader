const http = require('http'), fs = require('fs'), path = require('path');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain'};
http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(__dirname, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404, {'Content-Type': 'text/plain'}); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
    res.end(d);
  });
}).listen(process.env.PORT || 3000);
console.log('listening on ' + (process.env.PORT || 3000));
