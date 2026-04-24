import { createServer } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CLIENT_DIR = join(__dirname, 'dist', 'client');

// Discover the hashed CSS filename at startup so we can push preload headers
const assetsDir = join(CLIENT_DIR, 'assets');
const cssFile = existsSync(assetsDir)
  ? (await import('node:fs')).readdirSync(assetsDir).find(f => f.startsWith('globals') && f.endsWith('.css'))
  : null;
const CSS_PRELOAD = cssFile ? `</assets/${cssFile}>; rel=preload; as=style` : null;

const MIME = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const serverModule = await import(pathToFileURL(join(__dirname, 'dist', 'server', 'server.js')).href);
const handler = serverModule.default;

function tryStatic(req, res) {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  const filePath = join(CLIENT_DIR, urlPath);

  if (!filePath.startsWith(CLIENT_DIR)) return false;
  if (!existsSync(filePath)) return false;

  const stat = statSync(filePath);
  if (!stat.isFile()) return false;

  const mime = MIME[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  createReadStream(filePath).pipe(res);
  return true;
}

function nodeReqToWebRequest(req) {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url, `http://${host}`);

  const headers = new Headers();
  for (const [key, rawValue] of Object.entries(req.headers)) {
    if (rawValue === undefined) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const v of values) headers.append(key, v);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      resolve(
        new Request(url.href, {
          method: req.method || 'GET',
          headers,
          body: body?.length ? body : null,
          duplex: 'half',
        })
      );
    });
    req.on('error', reject);
  });
}

async function writeWebResponse(webRes, res) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  if (CSS_PRELOAD && (webRes.headers.get('content-type') || '').includes('text/html')) {
    res.setHeader('Link', CSS_PRELOAD);
  }

  if (!webRes.body) {
    res.end();
    return;
  }

  const nodeReadable = Readable.fromWeb(webRes.body);
  await pipeline(nodeReadable, res);
}

const server = createServer(async (req, res) => {
  try {
    if (tryStatic(req, res)) return;

    const webReq = await nodeReqToWebRequest(req);
    const webRes = await handler.fetch(webReq);
    await writeWebResponse(webRes, res);
  } catch (err) {
    console.error('[server-node] error:', err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[first-brain] listening on http://${HOST}:${PORT}`);
});
