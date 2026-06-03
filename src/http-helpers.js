// Small helpers for JSON responses, body parsing, and static file serving.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

/** Read and JSON-parse a request body, rejecting oversized or invalid input. */
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('request body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Serve a file from `root`, guarding against path traversal. Falls back to
 * index.html for "/". Returns true if handled, false if not found.
 */
export async function serveStatic(req, res, root, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';

  // Resolve within root and reject anything that escapes it.
  const target = normalize(join(root, rel));
  if (!target.startsWith(normalize(root))) {
    sendError(res, 403, 'forbidden');
    return true;
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) return false;
    const type = CONTENT_TYPES[extname(target)] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': info.size,
    });
    createReadStream(target).pipe(res);
    return true;
  } catch {
    return false;
  }
}
