// Assembles the HTTP server: API routing + static frontend + error handling.

import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PollStore } from './store.js';
import { createApiRouter } from './api.js';
import { sendError, serveStatic } from './http-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

/**
 * Create (but do not start) the HTTP server.
 * @param {{ store?: PollStore, publicDir?: string }} [opts]
 */
export function createApp({ store = new PollStore(), publicDir = PUBLIC_DIR } = {}) {
  const api = createApiRouter(store);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;

    try {
      if (path === '/api' || path.startsWith('/api/')) {
        const match = api.match(req.method, path);
        if (!match) return sendError(res, 404, 'not found');
        if (match.methodMismatch) {
          return sendError(res, 405, 'method not allowed');
        }
        await match.handler(req, res, match.params);
        return;
      }

      // Non-API paths: serve the static frontend.
      const handled = await serveStatic(req, res, publicDir, path);
      if (!handled) sendError(res, 404, 'not found');
    } catch (err) {
      const status = Number.isInteger(err?.status) ? err.status : 500;
      if (status >= 500) console.error('unhandled error:', err);
      if (!res.headersSent) {
        sendError(res, status, status >= 500 ? 'internal server error' : err.message);
      } else {
        res.destroy();
      }
    }
  });

  // Expose the store for tests/inspection.
  server.store = store;
  return server;
}
