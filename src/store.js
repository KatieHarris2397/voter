// In-memory store for polls. Single-threaded Node means no locking is needed;
// all mutations are synchronous.

import { randomUUID } from 'node:crypto';

/** Error carrying an HTTP-ish status code for the API layer to surface. */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

const MAX_QUESTION_LEN = 280;
const MAX_OPTION_LEN = 120;
const MAX_OPTIONS = 10;

export class PollStore {
  #polls = new Map();
  #now;

  /** @param {() => number} now injectable clock (ms) for deterministic tests */
  constructor(now = Date.now) {
    this.#now = now;
  }

  /**
   * Create a poll.
   * @param {string} question
   * @param {string[]} options - 2..10 non-empty, de-duplicated option labels
   */
  createPoll(question, options) {
    const q = typeof question === 'string' ? question.trim() : '';
    if (!q) throw new ValidationError('question is required');
    if (q.length > MAX_QUESTION_LEN) {
      throw new ValidationError(`question must be <= ${MAX_QUESTION_LEN} chars`);
    }

    if (!Array.isArray(options)) {
      throw new ValidationError('options must be an array');
    }
    const cleaned = options
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter((o) => o.length > 0);

    if (cleaned.length < 2) {
      throw new ValidationError('at least 2 non-empty options are required');
    }
    if (cleaned.length > MAX_OPTIONS) {
      throw new ValidationError(`at most ${MAX_OPTIONS} options are allowed`);
    }
    if (cleaned.some((o) => o.length > MAX_OPTION_LEN)) {
      throw new ValidationError(`options must be <= ${MAX_OPTION_LEN} chars`);
    }
    if (new Set(cleaned.map((o) => o.toLowerCase())).size !== cleaned.length) {
      throw new ValidationError('options must be unique');
    }

    const poll = {
      id: randomUUID(),
      question: q,
      options: cleaned.map((text) => ({ id: randomUUID(), text, votes: 0 })),
      totalVotes: 0,
      createdAt: new Date(this.#now()).toISOString(),
    };
    this.#polls.set(poll.id, poll);
    return this.#serialize(poll);
  }

  listPolls() {
    return [...this.#polls.values()]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((p) => this.#serialize(p));
  }

  getPoll(id) {
    const poll = this.#polls.get(id);
    if (!poll) throw new NotFoundError('poll not found');
    return this.#serialize(poll);
  }

  /** Record a vote for an option within a poll. */
  vote(pollId, optionId) {
    const poll = this.#polls.get(pollId);
    if (!poll) throw new NotFoundError('poll not found');
    const option = poll.options.find((o) => o.id === optionId);
    if (!option) throw new NotFoundError('option not found');

    option.votes += 1;
    poll.totalVotes += 1;
    return this.#serialize(poll);
  }

  deletePoll(id) {
    if (!this.#polls.has(id)) throw new NotFoundError('poll not found');
    this.#polls.delete(id);
  }

  size() {
    return this.#polls.size;
  }

  /** Add a computed percentage to each option without mutating stored state. */
  #serialize(poll) {
    return {
      id: poll.id,
      question: poll.question,
      totalVotes: poll.totalVotes,
      createdAt: poll.createdAt,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        votes: o.votes,
        percent:
          poll.totalVotes === 0
            ? 0
            : Math.round((o.votes / poll.totalVotes) * 100),
      })),
    };
  }
}
