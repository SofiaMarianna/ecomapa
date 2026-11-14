import assert from 'node:assert/strict';
import test from 'node:test';
import { errorHandler } from '../src/middlewares/errorHandler.js';

const ecoPointId = '550e8400-e29b-41d4-a716-446655440000';

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

const [
  { pool },
  { deleteEcoPoint: deleteEcoPointController },
  { ecoPointRoutes },
] = await Promise.all([
  import('../src/config/database.js'),
  import('../src/controllers/ecoPointController.js'),
  import('../src/routes/ecoPointRoutes.js'),
]);

async function withPoolQuery(query, run) {
  const originalQuery = pool.query;
  pool.query = query;

  try {
    await run();
  } finally {
    pool.query = originalQuery;
  }
}

function createResponse() {
  return {
    statusCode: null,
    body: undefined,
    ended: false,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function captureControllerError(id) {
  const response = createResponse();
  let caughtError;

  try {
    await deleteEcoPointController({ params: { id } }, response);
  } catch (error) {
    caughtError = error;
  }

  assert.ok(caughtError);
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    errorHandler(caughtError, {}, response, () => assert.fail('Unexpected error forwarding'));
  } finally {
    console.error = originalConsoleError;
  }

  return { response, caughtError };
}

test('DELETE /eco-points/:id is registered with the delete controller', () => {
  const deleteRouteLayer = ecoPointRoutes.stack.find(
    ({ route }) => route?.path === '/eco-points/:id' && route.methods.delete,
  );

  assert.ok(deleteRouteLayer);
  assert.equal(deleteRouteLayer.route.stack[0].handle, deleteEcoPointController);
});

test('invalid UUID returns HTTP 400 without querying PostgreSQL', async () => {
  let queryCount = 0;
  await withPoolQuery(async () => {
    queryCount += 1;
    return { rows: [] };
  }, async () => {
    const { response } = await captureControllerError('invalid');

    assert.equal(response.statusCode, 400);
    assert.match(response.body.error.message, /valid UUID/);
  });

  assert.equal(queryCount, 0);
});

test('successful deletion returns HTTP 204 with no body and uses a parameterized DELETE', async () => {
  let queryCall;
  await withPoolQuery(async (sql, values) => {
    queryCall = { sql: sql.trim(), values };
    return { rows: [{ id: ecoPointId }] };
  }, async () => {
    const response = createResponse();
    await deleteEcoPointController({ params: { id: ecoPointId } }, response);

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, undefined);
    assert.equal(response.ended, true);
  });

  assert.match(queryCall.sql, /^DELETE FROM public\.eco_point\s+WHERE id = \$1::uuid\s+RETURNING id;$/);
  assert.deepEqual(queryCall.values, [ecoPointId]);
});

test('valid UUID without a matching point returns HTTP 404', async () => {
  await withPoolQuery(async () => ({ rows: [] }), async () => {
    const { response } = await captureControllerError(ecoPointId);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.error.message, 'Eco point not found');
  });
});

test('PostgreSQL failure returns HTTP 503 and preserves the original cause', async () => {
  const originalError = new Error('simulated database failure');
  await withPoolQuery(async () => {
    throw originalError;
  }, async () => {
    const { response, caughtError } = await captureControllerError(ecoPointId);

    assert.equal(response.statusCode, 503);
    assert.equal(caughtError.cause, originalError);
  });
});

test('pool query override is restored after each test operation', async () => {
  const originalQuery = pool.query;
  await withPoolQuery(async () => ({ rows: [] }), async () => {
    assert.notEqual(pool.query, originalQuery);
  });

  assert.equal(pool.query, originalQuery);
});
