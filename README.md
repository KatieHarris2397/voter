# 🗳️ Voter

A small **live polls web app** with a JSON API and a browser frontend. Create a
poll, share the page, and watch votes update with live result bars.

It's built on **Node.js with the standard library only** — no Express, no build
step, no `node_modules`. That makes it trivial to run: if you have Node, you can
start it.

---

## Requirements

- **Node.js 20 or newer** (uses ES modules, the global `fetch`, and the built-in
  test runner). Check your version with:

  ```sh
  node --version
  ```

That's the entire list. There are no third-party dependencies to install.

---

## Getting it running

From the project directory:

```sh
# 1. (Optional) install dependencies — there are none, so this is a no-op
#    that simply confirms package.json is valid.
npm install

# 2. Start the server
npm start
```

You should see:

```
voter listening on http://0.0.0.0:3000
open the URL in a browser, or use the JSON API under /api
```

Now open **<http://localhost:3000>** in your browser and create a poll.

> Prefer not to use npm? You can run the server directly:
>
> ```sh
> node src/server.js
> ```

### Live-reload during development

```sh
npm run dev
```

This runs the server under `node --watch`, which restarts automatically when you
edit a file in `src/`.

### Configuration

The server reads two optional environment variables:

| Variable | Default   | Description                                  |
|----------|-----------|----------------------------------------------|
| `PORT`   | `3000`    | Port to listen on                            |
| `HOST`   | `0.0.0.0` | Interface to bind (use `127.0.0.1` for local-only) |

```sh
PORT=8080 npm start
```

Binding `0.0.0.0` and honoring `$PORT` means the app also runs unchanged on
hosting platforms that inject a port.

Press **Ctrl-C** to stop the server; it shuts down gracefully, closing open
connections before exiting.

---

## Using the API

The frontend is just a client of the same public JSON API. Base path: `/api`.

| Method   | Path                     | Description                                   |
|----------|--------------------------|-----------------------------------------------|
| `GET`    | `/api/health`            | Liveness check + current poll count           |
| `GET`    | `/api/polls`             | List all polls (newest first)                 |
| `POST`   | `/api/polls`             | Create a poll — `{ "question", "options":[] }` |
| `GET`    | `/api/polls/:id`         | Fetch a single poll with results              |
| `POST`   | `/api/polls/:id/vote`    | Cast a vote — `{ "optionId" }`                |
| `DELETE` | `/api/polls/:id`         | Delete a poll                                 |

Each poll response includes per-option `votes` and a computed `percent`.

### Examples

```sh
# Create a poll
curl -s -X POST localhost:3000/api/polls \
  -H 'Content-Type: application/json' \
  -d '{"question":"Best editor?","options":["vim","emacs","vscode"]}'

# -> {"id":"…","question":"Best editor?","totalVotes":0,"options":[
#      {"id":"…","text":"vim","votes":0,"percent":0}, … ]}

# Cast a vote (use ids from the create response)
curl -s -X POST localhost:3000/api/polls/<pollId>/vote \
  -H 'Content-Type: application/json' \
  -d '{"optionId":"<optionId>"}'

# List polls
curl -s localhost:3000/api/polls
```

Validation rules for creating a poll: a non-empty `question` (≤ 280 chars) and
between **2 and 10** unique, non-empty options (≤ 120 chars each). Invalid input
returns `400` with an `{ "error": "…" }` message.

---

## Running the tests

```sh
npm test
```

This runs the built-in Node test runner (`node --test`) across:

- **`test/store.test.js`** — poll creation, validation, voting math, ordering
- **`test/router.test.js`** — path/param matching, method-mismatch handling
- **`test/api.test.js`** — full HTTP lifecycle against a real server on an
  ephemeral port (create → vote → fetch → list → delete), error cases, and
  static-file serving

No watchers, no config, no extra tooling.

---

## How it's organized

```
voter/
├── package.json          # scripts + metadata (no dependencies)
├── src/
│   ├── server.js         # entry point: listen + graceful shutdown
│   ├── app.js            # request handler: API routing + static + errors
│   ├── api.js            # API route definitions
│   ├── router.js         # tiny ":param" path router
│   ├── store.js          # in-memory poll store with validation + vote math
│   └── http-helpers.js   # JSON replies, body parsing, safe static serving
├── public/               # the frontend (served as static files)
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── test/                 # node:test suites
```

**Design notes**

- **No dependencies, no build.** Everything uses Node built-ins (`node:http`,
  `node:crypto`, `node:fs`), so the source you read is the code that runs.
- **Testable composition.** `createApp({ store })` builds the server without
  starting it, so tests inject a fresh store and listen on port `0`.
- **In-memory storage.** Polls live in process memory and reset on restart —
  perfect for a demo, and easy to swap for a database behind the `PollStore`
  interface.
- **Safe by default.** Request bodies are capped at 1 MiB, and static file
  serving normalizes paths to prevent directory traversal outside `public/`.

---

## License

MIT
