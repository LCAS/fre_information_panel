/**
 * Static file server for the Vite-built React frontend.
 * Serves dist/ on port 5173.
 *
 * The rclnodejs/web WebSocket bridge is started separately
 * by ROS launch via the `start:bridge` npm script.
 */

import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 5173;
const DIST_DIR = fs.realpathSync(path.resolve(__dirname, 'dist'));
const IDLE_MS = Number.parseInt(process.env.FRE_INFORMATION_PANEL_IDLE_MS ?? '5000', 10);
const BRIDGE_HOST = process.env.FRE_INFORMATION_PANEL_BRIDGE_HOST ?? '127.0.0.1';
const BRIDGE_PORT = Number.parseInt(process.env.FRE_INFORMATION_PANEL_BRIDGE_PORT ?? '9000', 10);
const BRIDGE_ENDPOINT =
  process.env.FRE_INFORMATION_PANEL_BRIDGE_ENDPOINT?.startsWith('/') === true
    ? process.env.FRE_INFORMATION_PANEL_BRIDGE_ENDPOINT
    : '/capability';

const MIME_TYPES: Record<string, string> = {
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

function resolveDistPath(urlPathname: string): string | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(urlPathname);
  } catch {
    return null;
  }

  if (decodedPathname.includes('\0')) {
    return null;
  }

  const normalizedPathname = path.posix.normalize(decodedPathname.replaceAll('\\', '/'));
  if (!normalizedPathname.startsWith('/')) {
    return null;
  }

  const filePath = path.resolve(DIST_DIR, `.${normalizedPathname}`);
  if (!filePath.startsWith(`${DIST_DIR}${path.sep}`) && filePath !== DIST_DIR) {
    return null;
  }

  return filePath;
}

async function readDistFile(filePath: string): Promise<Buffer> {
  const realPath = await fs.promises.realpath(filePath);
  if (!realPath.startsWith(`${DIST_DIR}${path.sep}`)) {
    const error = new Error('Forbidden');
    (error as NodeJS.ErrnoException).code = 'EACCES';
    throw error;
  }

  const stats = await fs.promises.stat(realPath);
  if (!stats.isFile()) {
    const error = new Error('Not found');
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    throw error;
  }

  return fs.promises.readFile(realPath);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const urlPath = requestUrl.pathname;

  if (urlPath === '/config.json') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        idleMs: Number.isNaN(IDLE_MS) ? 5000 : IDLE_MS,
        bridgeEndpoint: BRIDGE_ENDPOINT,
      }),
    );
    return;
  }

  const filePath = resolveDistPath(urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  try {
    const data = await readDistFile(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EACCES') {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
      res.writeHead(500);
      res.end('Internal server error');
      return;
    }

    const indexPath = resolveDistPath('/index.html');
    if (!indexPath) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    try {
      const indexData = await readDistFile(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexData);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.on('upgrade', (req, socket, head) => {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  if (requestUrl.pathname !== BRIDGE_ENDPOINT) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const proxySocket = net.connect(BRIDGE_PORT, BRIDGE_HOST);

  proxySocket.on('connect', () => {
    const requestLine = `${req.method ?? 'GET'} ${req.url ?? '/capability'} HTTP/${req.httpVersion}\r\n`;
    const headerLines = Object.entries(req.headers)
      .flatMap(([name, value]) => {
        if (value === undefined) {
          return [];
        }
        if (Array.isArray(value)) {
          return value.map((entry) => `${name}: ${entry}\r\n`);
        }
        return [`${name}: ${value}\r\n`];
      })
      .join('');

    proxySocket.write(`${requestLine}${headerLines}\r\n`);
    if (head.length > 0) {
      proxySocket.write(head);
    }

    socket.pipe(proxySocket);
    proxySocket.pipe(socket);
  });

  proxySocket.on('error', () => {
    if (!socket.destroyed) {
      socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      socket.destroy();
    }
  });

  socket.on('error', () => {
    proxySocket.destroy();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[fre_information_panel] UI: http://0.0.0.0:${PORT}`);
});
