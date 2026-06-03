// Entry point: start the HTTP server and handle graceful shutdown.

import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = createApp();

server.listen(PORT, HOST, () => {
  const addr = server.address();
  console.log(`voter listening on http://${HOST}:${addr.port}`);
  console.log('open the URL in a browser, or use the JSON API under /api');
});

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Force-exit if connections linger.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
