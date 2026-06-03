// End-to-end API tests: start the real server on an ephemeral port and drive
// it with fetch.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const json = (method, path, body) =>
  fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

test('GET /api/health', async () => {
  const res = await json('GET', '/api/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('create, vote, fetch, list, delete lifecycle', async () => {
  // Create
  let res = await json('POST', '/api/polls', {
    question: 'Favorite season?',
    options: ['Spring', 'Summer', 'Fall', 'Winter'],
  });
  assert.equal(res.status, 201);
  assert.ok(res.headers.get('location'));
  const poll = await res.json();
  assert.equal(poll.options.length, 4);

  // Vote
  const optionId = poll.options[1].id;
  res = await json('POST', `/api/polls/${poll.id}/vote`, { optionId });
  assert.equal(res.status, 200);
  const voted = await res.json();
  assert.equal(voted.totalVotes, 1);
  assert.equal(voted.options.find((o) => o.id === optionId).percent, 100);

  // Fetch one
  res = await json('GET', `/api/polls/${poll.id}`);
  assert.equal(res.status, 200);

  // List
  res = await json('GET', '/api/polls');
  const { polls } = await res.json();
  assert.ok(polls.some((p) => p.id === poll.id));

  // Delete
  res = await json('DELETE', `/api/polls/${poll.id}`);
  assert.equal(res.status, 204);
  res = await json('GET', `/api/polls/${poll.id}`);
  assert.equal(res.status, 404);
});

test('validation errors return 400 with a message', async () => {
  const res = await json('POST', '/api/polls', { question: 'q', options: ['only'] });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /at least 2/);
});

test('invalid JSON body returns 400', async () => {
  const res = await fetch(base + '/api/polls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
});

test('unknown route 404, wrong method 405', async () => {
  assert.equal((await json('GET', '/api/nope')).status, 404);
  assert.equal((await json('DELETE', '/api/health')).status, 405);
});

test('serves the static frontend at /', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.match(html, /Voter/);
});
