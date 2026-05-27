/**
 * Static file server for the Vite-built React frontend.
 * Serves dist/ on port 5173.
 *
 * The rclnodejs/web WebSocket bridge (port 9000) is started separately
 * by ROS launch via the `start:bridge` npm script.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 5173;
const DIST_DIR = path.resolve(__dirname, 'dist');
const IDLE_MS = Number.parseInt(process.env.FRE_INFORMATION_PANEL_IDLE_MS ?? '5000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = (req.url ?? '/').split('?')[0];

  if (urlPath === '/config.json') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ idleMs: Number.isNaN(IDLE_MS) ? 5000 : IDLE_MS }));
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.resolve(DIST_DIR, '.' + urlPath);

  // Prevent path traversal outside dist/
  if (!filePath.startsWith(DIST_DIR + path.sep) && filePath !== DIST_DIR) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback — serve index.html for any unmatched route
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[fre_information_panel] UI: http://0.0.0.0:${PORT}`);
});
