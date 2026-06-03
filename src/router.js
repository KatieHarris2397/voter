// A minimal path router supporting ":param" segments, e.g. "/api/polls/:id".

export class Router {
  #routes = [];

  add(method, pattern, handler) {
    this.#routes.push({
      method,
      segments: pattern.split('/').filter(Boolean),
      handler,
    });
    return this;
  }

  get(pattern, handler) {
    return this.add('GET', pattern, handler);
  }
  post(pattern, handler) {
    return this.add('POST', pattern, handler);
  }
  delete(pattern, handler) {
    return this.add('DELETE', pattern, handler);
  }

  /**
   * Resolve a method + path to a handler and extracted params.
   * @returns {{handler: Function, params: object} | {methodMismatch: true} | null}
   */
  match(method, path) {
    const parts = path.split('/').filter(Boolean);
    let pathMatchedButWrongMethod = false;

    for (const route of this.#routes) {
      if (route.segments.length !== parts.length) continue;

      const params = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        if (seg.startsWith(':')) {
          params[seg.slice(1)] = decodeURIComponent(parts[i]);
        } else if (seg !== parts[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      if (route.method !== method) {
        pathMatchedButWrongMethod = true;
        continue;
      }
      return { handler: route.handler, params };
    }

    return pathMatchedButWrongMethod ? { methodMismatch: true } : null;
  }
}
