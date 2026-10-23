// Server Pengembangan Lokal (Zero-dependency Node.js)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// 1. Muat environment variables dari .env.local atau .env
function loadEnv() {
  const envFiles = ['.env.local', '.env', '.env.example'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (!process.env[key]) process.env[key] = val;
          }
        }
      }
      console.log(`[ENV] Memuat konfigurasi dari ${file}`);
      break;
    }
  }
}
loadEnv();

// 2. Jalankan build template public/*.html
try {
  require('./build.js');
} catch (e) {
  console.warn('[BUILD] Catatan build:', e.message);
}

const configHandler = require('./api/config.js');
// Muat ulang handler halaman setiap permintaan selama pengembangan lokal.
function pageHandler(req, res) {
  const modulePath = require.resolve('./api/page.js');
  delete require.cache[modulePath];
  return require(modulePath)(req, res);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // Helper response untuk kompatibilitas handler serverless
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };
  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };
  res.send = function(body) {
    res.end(body);
  };

  req.query = Object.fromEntries(urlObj.searchParams.entries());

  // Rute API Serverless
  if (pathname === '/api/config') {
    return configHandler(req, res);
  }
  if (pathname === '/api/page') {
    return pageHandler(req, res);
  }

  // Berkas Statis di public/
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (!path.extname(filePath)) filePath += '.html';

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    return fs.createReadStream(filePath).pipe(res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('404 Halaman Tidak Ditemukan');
});

function start(port) {
  server.removeAllListeners('error');
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[PORT] Port ${port} sedang dipakai, mencoba port ${port + 1}…`);
      start(port + 1);
    } else {
      console.error(err);
    }
  });
  server.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 ITENAS IoT Lab lokal berhasil dijalankan!`);
    console.log(`👉 Buka browser di: http://localhost:${port}`);
    console.log(`==================================================\n`);
  });
}

const initialPort = parseInt(process.env.PORT || '3000', 10);
start(initialPort);
