// Cliente HTTP para seeds del dashboard. Pega al gateway con prefijo /api/{svc}.
// Same-origin, sin CORS, todo pasa por el logging del gateway.

const DEFAULT_TIMEOUT_MS = 60000;

export class HttpError extends Error {
  constructor(status, url, body) {
    super("HTTP " + status + " en " + url);
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function requestJson(method, url, body, opts = {}) {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), timeout);
  const headers = { Accept: "application/json" };
  const init = { method, headers, signal: ctrl.signal, cache: "no-store" };
  if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        parsed = text;
      }
    }
    if (!res.ok) {
      throw new HttpError(res.status, url, parsed);
    }
    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestWithRetry(method, url, body, opts = {}) {
  const retries = opts.retries ?? 0;
  const retryDelayMs = opts.retryDelayMs ?? 500;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestJson(method, url, body, opts);
    } catch (err) {
      lastErr = err;
      const status = err && err.status;
      const isRetriable = !status || status >= 500 || status === 429 || err.name === "AbortError";
      if (attempt < retries && isRetriable) {
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export function createClient(baseOrigin = window.location.origin) {
  const base = baseOrigin.replace(/\/$/, "");
  function url(service, path) {
    const p = path.startsWith("/") ? path : "/" + path;
    if (!service) return base + p;
    return base + "/api/" + service + p;
  }
  return {
    post: (service, path, body, opts) => requestWithRetry("POST", url(service, path), body, opts),
    get: (service, path, opts) => requestWithRetry("GET", url(service, path), null, opts),
    patch: (service, path, body, opts) => requestWithRetry("PATCH", url(service, path), body, opts),
    delete: (service, path, opts) => requestWithRetry("DELETE", url(service, path), null, opts),
    // Método bajo nivel para casos raros
    request: (method, service, path, body, opts) => requestWithRetry(method, url(service, path), body, opts),
  };
}

// Helper para generar sufijos únicos por seed run
export function makeSuffix(prefix = "seed") {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 5);
}
