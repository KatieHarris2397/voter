import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PollStore, ValidationError, NotFoundError } from '../src/store.js';

test('createPoll returns a poll with option ids and zero votes', () => {
  const store = new PollStore();
  const poll = store.createPoll('Best language?', ['Go', 'Rust']);
  assert.ok(poll.id);
  assert.equal(poll.question, 'Best language?');
  assert.equal(poll.totalVotes, 0);
  assert.equal(poll.options.length, 2);
  assert.ok(poll.options.every((o) => o.id && o.votes === 0));
});

test('createPoll trims and validates input', () => {
  const store = new PollStore();
  assert.throws(() => store.createPoll('  ', ['a', 'b']), ValidationError);
  assert.throws(() => store.createPoll('q', ['only one']), ValidationError);
  assert.throws(() => store.createPoll('q', ['dup', 'DUP']), ValidationError);
  assert.throws(() => store.createPoll('q', 'notanarray'), ValidationError);
});

test('voting updates counts and percentages', () => {
  const store = new PollStore();
  const poll = store.createPoll('Tea or coffee?', ['Tea', 'Coffee']);
  const [tea, coffee] = poll.options;

  store.vote(poll.id, tea.id);
  store.vote(poll.id, tea.id);
  const after = store.vote(poll.id, coffee.id);

  assert.equal(after.totalVotes, 3);
  const teaResult = after.options.find((o) => o.id === tea.id);
  assert.equal(teaResult.votes, 2);
  assert.equal(teaResult.percent, 67); // 2/3 rounded
});

test('vote on missing poll or option throws NotFound', () => {
  const store = new PollStore();
  const poll = store.createPoll('q', ['a', 'b']);
  assert.throws(() => store.vote('nope', poll.options[0].id), NotFoundError);
  assert.throws(() => store.vote(poll.id, 'nope'), NotFoundError);
});

test('listPolls is newest-first and delete removes', () => {
  let t = 1000;
  const store = new PollStore(() => t++);
  const a = store.createPoll('first', ['x', 'y']);
  const b = store.createPoll('second', ['x', 'y']);

  const list = store.listPolls();
  assert.deepEqual(
    list.map((p) => p.id),
    [b.id, a.id],
  );

  store.deletePoll(a.id);
  assert.equal(store.size(), 1);
  assert.throws(() => store.getPoll(a.id), NotFoundError);
});
