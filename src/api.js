// API route definitions for the polls service.

import { Router } from './router.js';
import { readJsonBody, sendJson } from './http-helpers.js';

/**
 * Build the API router around a store.
 * @param {import('./store.js').PollStore} store
 */
export function createApiRouter(store) {
  const router = new Router();

  router.get('/api/health', (_req, res) => {
    sendJson(res, 200, { status: 'ok', polls: store.size() });
  });

  router.get('/api/polls', (_req, res) => {
    sendJson(res, 200, { polls: store.listPolls() });
  });

  router.post('/api/polls', async (req, res) => {
    const body = await readJsonBody(req);
    const poll = store.createPoll(body.question, body.options);
    res.setHeader('Location', `/api/polls/${poll.id}`);
    sendJson(res, 201, poll);
  });

  router.get('/api/polls/:id', (_req, res, params) => {
    sendJson(res, 200, store.getPoll(params.id));
  });

  router.post('/api/polls/:id/vote', async (req, res, params) => {
    const body = await readJsonBody(req);
    if (!body || typeof body.optionId !== 'string') {
      const err = new Error('optionId is required');
      err.status = 400;
      throw err;
    }
    sendJson(res, 200, store.vote(params.id, body.optionId));
  });

  router.delete('/api/polls/:id', (_req, res, params) => {
    store.deletePoll(params.id);
    res.writeHead(204);
    res.end();
  });

  return router;
}
