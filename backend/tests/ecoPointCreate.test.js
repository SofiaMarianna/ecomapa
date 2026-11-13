import assert from 'node:assert/strict';
import test from 'node:test';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { validateEcoPointCreate } from '../src/validators/ecoPointCreateValidator.js';

const firstMaterialId = '7a2c2d5a-8d35-4ce0-8815-f6fa3981309a';
const secondMaterialId = '8b3d2e6b-9e46-4df1-9926-a7fa3981309b';
const ecoPointId = '550e8400-e29b-41d4-a716-446655440000';

const requestBody = {
  name: ' Ponto Central ',
  address: ' Rua Exemplo, 120 ',
  description: '   ',
  latitude: -6.8891,
  longitude: -38.5612,
  material_ids: [firstMaterialId, secondMaterialId],
};

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
  { createEcoPoint: createEcoPointFromRepository },
  { createEcoPoint: createEcoPointController },
  { ecoPointRoutes },
] = await Promise.all([
  import('../src/config/database.js'),
  import('../src/repositories/ecoPointRepository.js'),
  import('../src/controllers/ecoPointController.js'),
  import('../src/routes/ecoPointRoutes.js'),
]);

class FakeClient {
  constructor({ existingMaterialIds = [firstMaterialId, secondMaterialId], failAt, failRollback = false } = {}) {
    this.existingMaterialIds = existingMaterialIds;
    this.failAt = failAt;
    this.failRollback = failRollback;
    this.statements = [];
    this.released = false;
    this.releaseError = undefined;
    this.originalError = new Error('simulated database failure');
    this.rollbackError = new Error('simulated rollback failure');
  }

  async query(sql, values = []) {
    const statement = sql.trim();
    this.statements.push({ statement, values });

    if (statement === 'BEGIN' || statement === 'COMMIT') return { rows: [] };
    if (statement === 'ROLLBACK') {
      if (this.failRollback) throw this.rollbackError;
      return { rows: [] };
    }

    if (statement.startsWith('SELECT id FROM public.material')) {
      return {
        rows: values[0]
          .filter((id) => this.existingMaterialIds.includes(id))
          .map((id) => ({ id })),
      };
    }

    if (statement.startsWith('INSERT INTO public.eco_point (')) {
      if (this.failAt === 'point') throw this.originalError;
      return { rows: [{ id: ecoPointId }] };
    }

    if (statement.startsWith('INSERT INTO public.eco_point_material')) {
      if (this.failAt === 'association') throw this.originalError;
      return { rows: [] };
    }

    if (statement.startsWith('SELECT') && statement.includes('eco_point.id')) {
      return {
        rows: [{
          id: ecoPointId,
          name: 'Ponto Central',
          address: 'Rua Exemplo, 120',
          description: null,
          latitude: -6.8891,
          longitude: -38.5612,
          is_demo: false,
          created_at: '2025-01-15T12:00:00.000Z',
          updated_at: '2025-01-15T12:00:00.000Z',
          materials: [
            { id: firstMaterialId, name: 'Metal', description: null },
            { id: secondMaterialId, name: 'Papel', description: null },
          ],
        }],
      };
    }

    throw new Error(`Unexpected SQL in test: ${statement}`);
  }

  release(error) {
    this.released = true;
    this.releaseError = error;
  }
}

async function withClient(client, run) {
  const originalConnect = pool.connect;
  pool.connect = async () => client;

  try {
    await run();
  } finally {
    pool.connect = originalConnect;
  }
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

test('validator trims required text, normalizes description and lowercases UUIDs', () => {
  assert.deepEqual(validateEcoPointCreate({
    ...requestBody,
    material_ids: [firstMaterialId.toUpperCase(), secondMaterialId],
  }), {
    name: 'Ponto Central',
    address: 'Rua Exemplo, 120',
    description: null,
    latitude: -6.8891,
    longitude: -38.5612,
    materialIds: [firstMaterialId, secondMaterialId],
  });
});

test('validator rejects invalid object shape, extra fields, string coordinates and duplicate UUIDs', () => {
  assert.throws(() => validateEcoPointCreate(null), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({ ...requestBody, id: ecoPointId }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({ ...requestBody, latitude: '-6.8891' }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({ ...requestBody, longitude: 180.01 }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({ ...requestBody, name: ' '.repeat(2) }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({ ...requestBody, name: 'A'.repeat(121) }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({ ...requestBody, material_ids: [] }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({ ...requestBody, material_ids: ['invalid'] }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({
    ...requestBody,
    material_ids: [`${firstMaterialId}\n`],
  }), { statusCode: 400 });
  assert.throws(() => validateEcoPointCreate({
    ...requestBody,
    material_ids: [firstMaterialId, firstMaterialId.toUpperCase()],
  }), { statusCode: 400 });
});

test('POST /api/eco-points is registered and controller returns 201 with the created point', async () => {
  const postRouteLayer = ecoPointRoutes.stack.find(
    ({ route }) => route?.path === '/eco-points' && route.methods.post,
  );
  assert.ok(postRouteLayer);
  assert.equal(postRouteLayer.route.stack[0].handle, createEcoPointController);

  const client = new FakeClient();

  await withClient(client, async () => {
    const response = createResponse();
    await createEcoPointController({ body: requestBody }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data.id, ecoPointId);
    assert.deepEqual(response.body.data.materials.map(({ name }) => name), ['Metal', 'Papel']);
    assert.equal(client.statements[0].statement, 'BEGIN');
    assert.equal(client.statements[1].statement, 'SELECT id FROM public.material WHERE id = ANY($1::uuid[]);');
    assert.match(client.statements[2].statement, /^INSERT INTO public\.eco_point \(/);
    assert.match(client.statements[3].statement, /^INSERT INTO public\.eco_point_material/);
    assert.match(client.statements[4].statement, /^SELECT/);
    assert.match(client.statements[4].statement, /ORDER BY material\.name ASC, material\.id ASC/);
    assert.equal(client.statements[5].statement, 'COMMIT');
    assert.match(client.statements[2].statement, /extensions\.ST_SetSRID/);
    assert.match(client.statements[2].statement, /extensions\.ST_MakePoint\(\$4::double precision, \$5::double precision\)/);
    assert.deepEqual(client.statements[2].values, [
      'Ponto Central',
      'Rua Exemplo, 120',
      null,
      -38.5612,
      -6.8891,
    ]);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
  });
});

test('missing materials roll back and become HTTP 400', async () => {
  const client = new FakeClient({ existingMaterialIds: [firstMaterialId] });

  await withClient(client, async () => {
    const response = createResponse();
    let caughtError;

    try {
      await createEcoPointController({ body: requestBody }, response);
    } catch (error) {
      caughtError = error;
    }

    assert.equal(caughtError.statusCode, 400);
    errorHandler(caughtError, {}, response, () => assert.fail('Unexpected error forwarding'));
    assert.equal(response.statusCode, 400);
    assert.match(response.body.error.message, /materials do not exist/);
    assert.deepEqual(client.statements.map(({ statement }) => statement), [
      'BEGIN',
      'SELECT id FROM public.material WHERE id = ANY($1::uuid[]);',
      'ROLLBACK',
    ]);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
  });
});

test('database errors roll back, release the client and become HTTP 503', async () => {
  const client = new FakeClient({ failAt: 'association' });

  await withClient(client, async () => {
    const response = createResponse();
    let caughtError;

    try {
      await createEcoPointController({ body: requestBody }, response);
    } catch (error) {
      caughtError = error;
    }

    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      errorHandler(caughtError, {}, response, () => assert.fail('Unexpected error forwarding'));
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(response.statusCode, 503);
    assert.deepEqual(client.statements.map(({ statement }) => statement), [
      'BEGIN',
      'SELECT id FROM public.material WHERE id = ANY($1::uuid[]);',
      client.statements[2].statement,
      client.statements[3].statement,
      'ROLLBACK',
    ]);
    assert.match(client.statements[2].statement, /^INSERT INTO public\.eco_point \(/);
    assert.match(client.statements[3].statement, /^INSERT INTO public\.eco_point_material/);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
  });
});

test('repository preserves the original error if both the transaction and rollback fail', async () => {
  const client = new FakeClient({ failAt: 'association', failRollback: true });
  const originalConnect = pool.connect;
  const originalConsoleError = console.error;
  pool.connect = async () => client;
  console.error = () => {};

  try {
    await assert.rejects(
      createEcoPointFromRepository({
        name: 'Ponto Central',
        address: 'Rua Exemplo, 120',
        description: null,
        latitude: -6.8891,
        longitude: -38.5612,
        materialIds: [firstMaterialId, secondMaterialId],
      }),
      (error) => error === client.originalError,
    );
    assert.equal(client.statements.at(-1).statement, 'ROLLBACK');
    assert.equal(client.rollbackError instanceof Error, true);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, client.rollbackError);
  } finally {
    pool.connect = originalConnect;
    console.error = originalConsoleError;
  }
});
