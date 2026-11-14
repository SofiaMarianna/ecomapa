import { env } from '../config/env.js';

const REQUEST_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_MAX_ENTRIES = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class NominatimClientError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message, options);
    this.name = 'NominatimClientError';
    this.statusCode = statusCode;
  }
}

function createHttpCause(status) {
  return new Error(`Nominatim returned HTTP ${status}`);
}

export function createNominatimClient({
  baseUrl = env.NOMINATIM_BASE_URL,
  userAgent = env.NOMINATIM_USER_AGENT,
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = Date.now,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  timeoutMs = REQUEST_TIMEOUT_MS,
  requestIntervalMs = REQUEST_INTERVAL_MS,
  cacheMaxEntries = CACHE_MAX_ENTRIES,
  cacheTtlMs = CACHE_TTL_MS,
} = {}) {
  const cache = new Map();
  const inFlight = new Map();
  let requestQueue = Promise.resolve();
  let lastRequestStartedAt = Number.NEGATIVE_INFINITY;

  function getCachedValue(key) {
    const entry = cache.get(key);
    if (!entry) return { found: false };
    if (entry.expiresAt <= now()) {
      cache.delete(key);
      return { found: false };
    }

    cache.delete(key);
    cache.set(key, entry);
    return { found: true, value: entry.value };
  }

  function putCachedValue(key, value) {
    cache.delete(key);
    cache.set(key, { value, expiresAt: now() + cacheTtlMs });

    for (const [cachedKey, entry] of cache) {
      if (entry.expiresAt <= now()) cache.delete(cachedKey);
    }
    while (cache.size > cacheMaxEntries) {
      cache.delete(cache.keys().next().value);
    }
  }

  async function fetchJson(path, parameters, { notFoundIsEmpty = false } = {}) {
    const url = new URL(path, `${baseUrl.replace(/\/+$/, '')}/`);
    url.search = new URLSearchParams(parameters).toString();

    const controller = new AbortController();
    let timeout;
    try {
      timeout = setTimeoutFn(() => controller.abort(), timeoutMs);
      const response = await fetchImpl(url, {
        headers: { 'User-Agent': userAgent },
        signal: controller.signal,
      });

      if (notFoundIsEmpty && response.status === 404) return null;
      if (!response.ok) {
        const statusCode = response.status === 429 || response.status >= 500 ? 503 : 502;
        throw new NominatimClientError(
          statusCode,
          'Geocoding provider returned an unsuccessful response',
          { cause: createHttpCause(response.status) },
        );
      }

      try {
        return await response.json();
      } catch (error) {
        throw new NominatimClientError(502, 'Geocoding provider returned invalid JSON', { cause: error });
      }
    } catch (error) {
      if (error instanceof NominatimClientError) throw error;
      if (controller.signal.aborted || error?.name === 'AbortError') {
        throw new NominatimClientError(504, 'Geocoding provider request timed out', { cause: error });
      }
      throw new NominatimClientError(502, 'Geocoding provider communication failed', { cause: error });
    } finally {
      if (timeout !== undefined) clearTimeoutFn(timeout);
    }
  }

  function request(key, path, parameters, options) {
    const cached = getCachedValue(key);
    if (cached.found) return Promise.resolve(cached.value);
    if (inFlight.has(key)) return inFlight.get(key);

    const pending = requestQueue.then(async () => {
      const waitMs = Math.max(0, lastRequestStartedAt + requestIntervalMs - now());
      if (waitMs > 0) await sleep(waitMs);
      lastRequestStartedAt = now();

      const result = await fetchJson(path, parameters, options);
      putCachedValue(key, result);
      return result;
    });

    inFlight.set(key, pending);
    requestQueue = pending.then(() => undefined, () => undefined);
    pending.then(
      () => inFlight.delete(key),
      () => inFlight.delete(key),
    );
    return pending;
  }

  return Object.freeze({
    search(query) {
      const key = `search:${query}`;
      return request(key, 'search', {
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'br',
      });
    },
    reverse(latitude, longitude) {
      const key = `reverse:${latitude},${longitude}`;
      return request(key, 'reverse', {
        lat: String(latitude),
        lon: String(longitude),
        format: 'jsonv2',
        addressdetails: '1',
      }, { notFoundIsEmpty: true });
    },
  });
}

export const nominatimClient = createNominatimClient();
