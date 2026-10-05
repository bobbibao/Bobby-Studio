'use strict';
// A minimal in-process fake of the Google Cloud Storage JSON API (objects: insert, get, download, delete, list).
// It lets the real @google-cloud/storage client talk HTTP to a local server through STORAGE_EMULATOR_HOST.
// This verifies adapter wiring and error mapping. It is NOT Google's service: IAM, signed URLs, retries,
// consistency and quota behavior are not modeled, so a live bucket check remains a separate prerequisite.
const http = require('http');
const crypto = require('crypto');

// CRC32C (Castagnoli), the checksum the Google client verifies on uploads and downloads.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0x82f63b78 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32c(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  const out = Buffer.alloc(4);
  out.writeUInt32BE((c ^ 0xffffffff) >>> 0);
  return out.toString('base64');
}

function parseMultipart(body, contentType) {
  const boundary = /boundary=("?)([^";]+)\1/.exec(contentType)?.[2];
  if (!boundary) throw new Error('multipart boundary missing');
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let index = body.indexOf(delimiter);
  while (index !== -1) {
    const next = body.indexOf(delimiter, index + delimiter.length);
    if (next === -1) break;
    // Skip the CRLF after the delimiter and the CRLF before the next one.
    parts.push(body.subarray(index + delimiter.length + 2, next - 2));
    index = next;
  }
  return parts.map((part) => {
    const split = part.indexOf('\r\n\r\n');
    return { headers: part.subarray(0, split).toString('utf8'), body: part.subarray(split + 4) };
  });
}

function startFakeGcs({ bucket }) {
  const objects = new Map();
  const requests = [];

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url, 'http://localhost');
      requests.push(`${req.method} ${url.pathname}`);
      const json = (status, payload) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      const notFound = () => json(404, { error: { code: 404, message: 'Not Found' } });
      const meta = (name) => {
        const stored = objects.get(name);
        return {
          kind: 'storage#object', name, bucket, size: String(stored.bytes.length), contentType: stored.contentType, generation: '1',
          crc32c: crc32c(stored.bytes), md5Hash: crypto.createHash('md5').update(stored.bytes).digest('base64'),
        };
      };

      const upload = new RegExp(`^/upload/storage/v1/b/${bucket}/o$`).exec(url.pathname);
      if (req.method === 'POST' && upload) {
        const [metadata, content] = parseMultipart(body, req.headers['content-type'] ?? '');
        const parsed = JSON.parse(metadata.body.toString('utf8'));
        const name = parsed.name ?? url.searchParams.get('name');
        objects.set(name, { bytes: Buffer.from(content.body), contentType: parsed.contentType ?? 'application/octet-stream' });
        return json(200, meta(name));
      }

      const single = new RegExp(`^(?:/download)?/storage/v1/b/${bucket}/o/(.+)$`).exec(url.pathname);
      if (single) {
        const name = decodeURIComponent(single[1]);
        if (req.method === 'DELETE') {
          if (!objects.delete(name)) return notFound();
          res.writeHead(204);
          return res.end();
        }
        if (req.method === 'GET') {
          if (!objects.has(name)) return notFound();
          if (url.searchParams.get('alt') === 'media' || url.pathname.startsWith('/download/')) {
            res.writeHead(200, { 'content-type': objects.get(name).contentType });
            return res.end(objects.get(name).bytes);
          }
          return json(200, meta(name));
        }
      }

      if (req.method === 'GET' && url.pathname === `/storage/v1/b/${bucket}/o`) {
        const prefix = url.searchParams.get('prefix') ?? '';
        const items = [...objects.keys()].filter((name) => name.startsWith(prefix)).sort().map(meta);
        return json(200, { kind: 'storage#objects', items });
      }
      return notFound();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        objects,
        requests,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

module.exports = { startFakeGcs };
