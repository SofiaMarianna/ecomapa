import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { HttpError } from '../src/middlewares/httpError.js';
import { validateGeocodeCoordinates } from '../src/validators/geocodeCoordinatesValidator.js';
import { validateGeocodeSearch } from '../src/validators/geocodeSearchValidator.js';

for (const [name, value] of Object.entries({
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'ecomapa_test',
  DB_USER: 'test',
  DB_PASSWORD: 'test',
  CORS_ORIGIN: 'http://localhost:3000',
})) {
  if (!process.env[name]) process.env[name] = value;
}
process.env.NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
process.env.NOMINATIM_USER_AGENT = 'EcoMapa test (+https://github.com/example/ecomapa)';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const [
  { createNominatimClient, NominatimClientError },
  { createGeocodeService },
  { createGeocodeController },
  { apiRoutes },
  { geocodeRoutes },
  { searchGeocode, reverseGeocode },
] = await Promise.all([
  import('../src/clients/nominatimClient.js'),
  import('../src/services/geocodeService.js'),
  import('../src/controllers/geocodeController.js'),
  import('../src/routes/apiRoutes.js'),
  import('../src/routes/geocodeRoutes.js'),
  import('../src/controllers/geocodeController.js'),
]);

const clientOptions = {
  baseUrl: 'https://nominatim.example/v1',
  userAgent: 'EcoMapa tests (+https://github.com/example/ecomapa)',
};

function createClient(options = {}) {
  return createNominatimClient({
    ...clientOptions,
    fetchImpl: (...args) => globalThis.fetch(...args),
    ...options,
  });
}

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  };
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function providerResult(overrides = {}) {
  return {
    lat: '-6.8891',
    lon: '-38.5612',
    display_name: 'Rua Exemplo, Cajazeiras, Brasil',
    osm_type: 'way',
    osm_id: '12345',
    category: 'highway',
    type: 'residential',
    address: { road: 'Rua Exemplo', city: 'Cajazeiras' },
    ...overrides,
  };
}

test('registers both geocoding routes under the API router', () => {
  const searchRoute = geocodeRoutes.stack.find(
    ({ route }) => route?.path === '/geocode/search' && route.methods.get,
  );
  const reverseRoute = geocodeRoutes.stack.find(
    ({ route }) => route?.path === '/geocode/reverse' && route.methods.get,
  );
  assert.ok(apiRoutes.stack.some(({ handle }) => handle === geocodeRoutes));
  assert.equal(searchRoute.route.stack[0].handle, searchGeocode);
  assert.equal(reverseRoute.route.stack[0].handle, reverseGeocode);
});

test('search validates a unique, non-empty, trimmed query up to 200 characters', () => {
  assert.equal(validateGeocodeSearch({ q: '  Rua Exemplo  ' }), 'Rua Exemplo');
  for (const query of [
    {},
    { q: '' },
    { q: ' \t ' },
    { q: ['Rua', 'Exemplo'] },
    { q: 'a'.repeat(201) },
  ]) {
    assert.throws(() => validateGeocodeSearch(query), { statusCode: 400 });
  }
});

test('coordinates require unique finite lat/lon values within their ranges', () => {
  assert.deepEqual(validateGeocodeCoordinates({ lat: '-90', lon: '180' }), { lat: -90, lon: 180 });
  for (const query of [
    {},
    { lat: '', lon: '0' },
    { lat: '0', lon: ' ' },
    { lat: 'north', lon: '0' },
    { lat: '0', lon: 'Infinity' },
    { lat: '90.1', lon: '0' },
    { lat: '0', lon: '-180.1' },
    { lat: ['0', '1'], lon: '0' },
    { lat: '0', lon: ['0', '1'] },
    { lat: '0', lng: '0' },
  ]) {
    assert.throws(() => validateGeocodeCoordinates(query), { statusCode: 400 });
  }
});

test('search sends the encoded query, required parameters and EcoMapa User-Agent', async () => {
  const searchText = 'Rua A & B, Cajazeiras/PB';
  let capturedUrl;
  let capturedOptions;
  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return jsonResponse([]);
  };

  await createClient().search(searchText);

  const url = new URL(capturedUrl);
  assert.equal(url.href, `https://nominatim.example/v1/search?${url.searchParams.toString()}`);
  assert.equal(url.searchParams.get('q'), searchText);
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('addressdetails'), '1');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.equal(url.searchParams.get('countrycodes'), 'br');
  assert.match(capturedUrl.href, /%26/);
  assert.equal(capturedOptions.headers['User-Agent'], clientOptions.userAgent);
});

test('reverse sends validated lat/lon and the shared format parameters', async () => {
  let capturedUrl;
  globalThis.fetch = async (url) => {
    capturedUrl = url;
    return jsonResponse(providerResult());
  };

  await createClient().reverse(-6.8891, -38.5612);

  const url = new URL(capturedUrl);
  assert.equal(url.pathname, '/v1/reverse');
  assert.equal(url.searchParams.get('lat'), '-6.8891');
  assert.equal(url.searchParams.get('lon'), '-38.5612');
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('addressdetails'), '1');
});

test('search maps provider results and the controller returns them in data', async () => {
  const service = createGeocodeService({
    search: async () => [providerResult()],
    reverse: async () => providerResult(),
  });
  const controller = createGeocodeController(service);
  const response = createResponse();

  await controller.searchGeocode({ query: { q: 'Rua Exemplo' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    data: [{
      lat: -6.8891,
      lon: -38.5612,
      display_name: 'Rua Exemplo, Cajazeiras, Brasil',
      osm_type: 'way',
      osm_id: '12345',
      category: 'highway',
      type: 'residential',
      address: { road: 'Rua Exemplo', city: 'Cajazeiras' },
    }],
  });
});

test('malformed provider address data becomes HTTP 502', async () => {
  const service = createGeocodeService({
    search: async () => [providerResult({ address: 'not an address object' })],
    reverse: async () => null,
  });

  await assert.rejects(service.search({ q: 'Rua Exemplo' }), (error) => (
    error instanceof HttpError
    && error.statusCode === 502
    && error.cause instanceof NominatimClientError
  ));
});

test('reverse controller returns HTTP 200 with numeric coordinates and string osm_id', async () => {
  const service = createGeocodeService({
    search: async () => [],
    reverse: async () => providerResult({ osm_id: 12345 }),
  });
  const controller = createGeocodeController(service);
  const response = createResponse();

  await controller.reverseGeocode({
    query: { lat: '-6.8891', lon: '-38.5612' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    data: {
      lat: -6.8891,
      lon: -38.5612,
      display_name: 'Rua Exemplo, Cajazeiras, Brasil',
      osm_type: 'way',
      osm_id: '12345',
      category: 'highway',
      type: 'residential',
      address: { road: 'Rua Exemplo', city: 'Cajazeiras' },
    },
  });
  assert.equal(typeof response.body.data.lat, 'number');
  assert.equal(typeof response.body.data.lon, 'number');
  assert.equal(typeof response.body.data.osm_id, 'string');
});

test('search without results returns an empty data array', async () => {
  const service = createGeocodeService({ search: async () => [], reverse: async () => null });
  assert.deepEqual(await service.search({ q: 'endereço inexistente' }), []);
});

test('reverse without a result returns HTTP 404', async () => {
  const client = createClient();
  globalThis.fetch = async () => jsonResponse({ error: 'Unable to geocode' });
  const service = createGeocodeService(client);

  await assert.rejects(
    service.reverse({ lat: '-6.8891', lon: '-38.5612' }),
    { statusCode: 404, message: 'Address not found' },
  );
});

test('repeated and concurrent identical lookups reuse the cached result', async () => {
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse([providerResult()]);
  };
  const client = createClient();

  const results = await Promise.all([
    client.search('Rua Exemplo'),
    client.search('Rua Exemplo'),
  ]);
  await client.search('Rua Exemplo');

  assert.equal(fetchCount, 1);
  assert.deepEqual(results[0], results[1]);
});

test('cache entries expire and the cache stays within its configured capacity', async () => {
  let nowValue = 0;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse([]);
  };
  const client = createClient({
    now: () => nowValue,
    requestIntervalMs: 0,
    cacheTtlMs: 10,
    cacheMaxEntries: 1,
  });

  await client.search('first');
  await client.search('second');
  await client.search('first');
  nowValue = 10;
  await client.search('first');

  assert.equal(fetchCount, 4);
});

test('LRU cache evicts the least recently used entry', async () => {
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse([]);
  };

  const client = createClient({
    requestIntervalMs: 0,
    cacheMaxEntries: 2,
  });

  await client.search('first');
  await client.search('second');
  await client.search('first');
  await client.search('third');

  await client.search('first');
  await client.search('second');

  assert.equal(fetchCount, 4);
});

test('concurrent search and reverse calls share the one-request-per-second limit', async () => {
  let nowValue = 0;
  const requestStartTimes = [];
  globalThis.fetch = async (url) => {
    requestStartTimes.push(nowValue);
    return jsonResponse(url.pathname.endsWith('/reverse') ? providerResult() : []);
  };
  const client = createClient({
    now: () => nowValue,
    sleep: async (milliseconds) => {
      nowValue += milliseconds;
    },
  });

  await Promise.all([
    client.search('first'),
    client.reverse(-6.8, -38.5),
    client.search('second'),
  ]);

  assert.equal(requestStartTimes.length, 3);
  assert.deepEqual(requestStartTimes, [0, 1000, 2000]);
});

test('timeout becomes 504 and preserves the original abort cause', async () => {
  const abortError = Object.assign(new Error('mock abort'), { name: 'AbortError' });
  globalThis.fetch = (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(abortError), { once: true });
  });
  const client = createClient({
    setTimeoutFn(callback) {
      queueMicrotask(callback);
      return 1;
    },
    clearTimeoutFn() {},
  });

  await assert.rejects(client.search('timeout'), (error) => (
    error instanceof NominatimClientError
    && error.statusCode === 504
    && error.cause === abortError
  ));
});

test('network failure becomes 502 with the original error as cause', async () => {
  const networkError = new TypeError('mock network failure');
  globalThis.fetch = async () => {
    throw networkError;
  };

  await assert.rejects(createClient().search('network'), (error) => (
    error instanceof NominatimClientError
    && error.statusCode === 502
    && error.cause === networkError
  ));
});

test('provider HTTP 429 and 5xx responses become 503', async (context) => {
  for (const status of [429, 500, 503]) {
    await context.test(`HTTP ${status}`, async () => {
      globalThis.fetch = async () => jsonResponse({}, status);
      const service = createGeocodeService(createClient());
      await assert.rejects(service.search({ q: `status ${status}` }), (error) => (
        error instanceof HttpError
        && error.statusCode === 503
        && error.cause instanceof NominatimClientError
        && error.cause.cause.message === `Nominatim returned HTTP ${status}`
      ));
    });
  }
});

test('invalid provider JSON becomes 502 and preserves its parse error', async () => {
  const parseError = new SyntaxError('invalid mock JSON');
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw parseError;
    },
  });
  const service = createGeocodeService(createClient());

  await assert.rejects(service.search({ q: 'invalid JSON' }), (error) => (
    error.statusCode === 502
    && error.cause instanceof NominatimClientError
    && error.cause.cause === parseError
  ));
});

test('provider errors return sanitized client messages', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => {
    throw new Error('private provider diagnostic');
  };

  try {
    const service = createGeocodeService(createClient());
    let caughtError;
    try {
      await service.search({ q: 'safe response' });
    } catch (error) {
      caughtError = error;
    }

    const response = createResponse();
    errorHandler(caughtError, {}, response, () => assert.fail('Unexpected error forwarding'));
    assert.equal(response.statusCode, 502);
    assert.equal(response.body.error.message, 'Geocoding provider communication failed');
    assert.doesNotMatch(JSON.stringify(response.body), /private provider diagnostic/);
  } finally {
    console.error = originalConsoleError;
  }
});
