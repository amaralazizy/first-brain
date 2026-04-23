import { createServer } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const serverModule = await import(pathToFileURL(path.join(__dirname, 'dist/server/server.js')).href);
const handler = serverModule.default;

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
          // @ts-ignore — duplex required for POST with body in Node 18+
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

  if (!webRes.body) {
    res.end();
    return;
  }

  const nodeReadable = Readable.fromWeb(webRes.body);
  await pipeline(nodeReadable, res);
}

const server = createServer(async (req, res) => {
  try {
    const webReq = await nodeReqToWebRequest(req);
    const webRes = await handler.fetch(webReq);
    await writeWebResponse(webRes, res);
  } catch (err) {
    console.error('[server-node] unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[first-brain] web server listening on http://${HOST}:${PORT}`);
});
