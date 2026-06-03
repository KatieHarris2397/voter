import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Router } from '../src/router.js';

test('matches static and param routes', () => {
  const router = new Router();
  const h1 = () => {};
  const h2 = () => {};
  router.get('/api/polls', h1).get('/api/polls/:id', h2);

  const m1 = router.match('GET', '/api/polls');
  assert.equal(m1.handler, h1);
  assert.deepEqual(m1.params, {});

  const m2 = router.match('GET', '/api/polls/abc-123');
  assert.equal(m2.handler, h2);
  assert.deepEqual(m2.params, { id: 'abc-123' });
});

test('decodes encoded params', () => {
  const router = new Router();
  router.get('/api/x/:id', () => {});
  const m = router.match('GET', '/api/x/a%2Fb');
  assert.equal(m.params.id, 'a/b');
});

test('reports method mismatch separately from no-match', () => {
  const router = new Router();
  router.get('/api/polls', () => {});
  assert.deepEqual(router.match('POST', '/api/polls'), { methodMismatch: true });
  assert.equal(router.match('GET', '/api/nope'), null);
});

test('distinguishes by segment count', () => {
  const router = new Router();
  router.get('/api/polls/:id', () => {});
  assert.equal(router.match('GET', '/api/polls'), null);
  assert.ok(router.match('GET', '/api/polls/1'));
});
