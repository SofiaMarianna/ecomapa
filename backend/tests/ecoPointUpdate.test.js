import assert from 'node:assert/strict';
import test from 'node:test';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { validateEcoPointCreate } from '../src/validators/ecoPointCreateValidator.js';

const firstMaterialId = '7a2c2d5a-8d35-4ce0-8815-f6fa3981309a';
const secondMaterialId = '8b3d2e6b-9e46-4df1-9926-a7fa3981309b';
const missingMaterialId = '9c4e3f7c-af57-4ef2-a037-b8fa3981309c';
const ecoPointId = '550e8400-e29b-41d4-a716-446655440000';

const requestBody = {
  name: 'Ponto Central Atualizado',
  address: 'Rua Exemplo, 150',
  description: 'Nova localização e informações.',
  latitude: -6.89,
  longitude: -38.56,
  material_ids: [firstMaterialId, secondMaterialId],
};

const updatedEcoPoint = {
  id: ecoPointId,
  name: requestBody.name,
  address: requestBody.address,
  description: requestBody.description,
  latitude: requestBody.latitude,
  longitude: requestBody.longitude,
  is_demo: true,
  created_at: '2025-01-15T12:00:00.000Z',
  updated_at: '2025-02-15T12:00:00.000Z',
  materials: [
    { id: secondMaterialId, name: 'Glass', description: null },
    { id: firstMaterialId, name: 'Metal', description: null },
  ],
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
  { updateEcoPoint: updateEcoPointController },
  { ecoPointRoutes },
] = await Promise.all([
  import('../src/config/database.js'),
  import('../src/controllers/ecoPointController.js'),
  import('../src/routes/ecoPointRoutes.js'),
]);

class FakeClient {
  constructor({
    existingMaterialIds = [firstMaterialId, secondMaterialId],
    failAt,
    failRollback = false,
    pointExists = true,
  } = {}) {
    this.existingMaterialIds = existingMaterialIds;
    this.failAt = failAt;
    this.failRollback = failRollback;
    this.pointExists = pointExists;
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

    if (statement.startsWith('SELECT id FROM public.eco_point')) {
      return { rows: this.pointExists ? [{ id: ecoPointId }] : [] };
    }

    if (statement.startsWith('SELECT id FROM public.material')) {
      return {
        rows: values[0]
          .filter((id) => this.existingMaterialIds.includes(id))
          .map((id) => ({ id })),
      };
    }

    if (statement.startsWith('UPDATE public.eco_point')) {
      if (this.failAt === 'update') throw this.originalError;
      return { rows: [] };
    }

    if (statement.startsWith('DELETE FROM public.eco_point_material')) {
      if (this.failAt === 'delete') throw this.originalError;
      return { rows: [] };
    }

    if (statement.startsWith('INSERT INTO public.eco_point_material')) {
      if (this.failAt === 'insert') throw this.originalError;
      return { rows: [] };
    }

    if (statement.startsWith('SELECT') && statement.includes('eco_point.id')) {
      if (this.failAt === 'details') throw this.originalError;
      return { rows: [updatedEcoPoint] };
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

async function captureControllerError(client, id, body) {
  const response = createResponse();
  let caughtError;

  await withClient(client, async () => {
    try {
      await updateEcoPointController({ params: { id }, body }, response);
    } catch (error) {
      caughtError = error;
    }
  });

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

test('PUT /eco-points/:id is registered with the update controller', () => {
  const putRouteLayer = ecoPointRoutes.stack.find(
    ({ route }) => route?.path === '/eco-points/:id' && route.methods.put,
  );
  assert.ok(putRouteLayer);
  assert.equal(putRouteLayer.route.stack[0].handle, updateEcoPointController);
});

test('invalid UUID and invalid bodies return HTTP 400 before connecting to the database', async () => {
  const client = new FakeClient();

  await withClient(client, async () => {
    const invalidIdResponse = createResponse();
    await assert.rejects(
      updateEcoPointController({ params: { id: 'invalid' }, body: requestBody }, invalidIdResponse),
      { statusCode: 400 },
    );

    for (const body of [
      null,
      { ...requestBody, extra: true },
      { ...requestBody, latitude: 91 },
      { ...requestBody, longitude: '-38.56' },
      { ...requestBody, material_ids: [firstMaterialId, firstMaterialId.toUpperCase()] },
    ]) {
      const response = createResponse();
      await assert.rejects(
        updateEcoPointController({ params: { id: ecoPointId }, body }, response),
        { statusCode: 400 },
      );
    }
  });

  assert.deepEqual(client.statements, []);
  assert.equal(client.released, false);
});

test('the shared validator retains POST normalization rules for PUT', () => {
  assert.deepEqual(validateEcoPointCreate({
    ...requestBody,
    description: '   ',
    material_ids: [firstMaterialId.toUpperCase(), secondMaterialId],
  }), {
    name: requestBody.name,
    address: requestBody.address,
    description: null,
    latitude: requestBody.latitude,
    longitude: requestBody.longitude,
    materialIds: [firstMaterialId, secondMaterialId],
  });
});

test('existing eco point and materials are replaced atomically and returned in sorted order', async () => {
  const client = new FakeClient();

  await withClient(client, async () => {
    const response = createResponse();
    await updateEcoPointController({ params: { id: ecoPointId }, body: requestBody }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.data, updatedEcoPoint);
    assert.deepEqual(response.body.data.materials.map(({ name }) => name), ['Glass', 'Metal']);
    assert.deepEqual(client.statements.map(({ statement }) => {
      if (statement.startsWith('SELECT') && statement.includes('eco_point.id')) return 'DETAILS';
      if (statement.startsWith('SELECT id FROM public.eco_point')) return 'LOCK';
      if (statement.startsWith('SELECT id FROM public.material')) return 'MATERIALS';
      if (statement.startsWith('UPDATE public.eco_point')) return 'UPDATE';
      if (statement.startsWith('DELETE FROM public.eco_point_material')) return 'DELETE';
      if (statement.startsWith('INSERT INTO public.eco_point_material')) return 'INSERT';
      return statement;
    }), [
      'BEGIN',
      'LOCK',
      'MATERIALS',
      'UPDATE',
      'DELETE',
      'INSERT',
      'DETAILS',
      'COMMIT',
    ]);

    const lockQuery = client.statements[1];
    assert.match(lockQuery.statement, /FOR UPDATE/);
    assert.deepEqual(lockQuery.values, [ecoPointId]);
    assert.match(client.statements[3].statement, /extensions\.ST_SetSRID/);
    assert.match(
      client.statements[3].statement,
      /extensions\.ST_MakePoint\(\$4::double precision, \$5::double precision\)/,
    );
    assert.deepEqual(client.statements[3].values, [
      requestBody.name,
      requestBody.address,
      requestBody.description,
      requestBody.longitude,
      requestBody.latitude,
      ecoPointId,
    ]);
    assert.deepEqual(client.statements[5].values, [ecoPointId, requestBody.material_ids]);
    assert.match(client.statements[6].statement, /ORDER BY material\.name ASC, material\.id ASC/);

    const updateStatement = client.statements[3].statement;
    const assignments = updateStatement.slice(updateStatement.indexOf('SET'), updateStatement.indexOf('WHERE'));
    assert.doesNotMatch(assignments, /\b(?:id|is_demo|created_at|updated_at)\s*=/);
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
  });
});

test('valid UUID without a matching point returns HTTP 404 after rollback', async () => {
  const client = new FakeClient({ pointExists: false });
  const { response } = await captureControllerError(client, ecoPointId, requestBody);

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.error.message, 'Eco point not found');
  assert.deepEqual(client.statements.map(({ statement }) => statement), [
    'BEGIN',
    'SELECT id FROM public.eco_point WHERE id = $1::uuid FOR UPDATE;',
    'ROLLBACK',
  ]);
  assert.equal(client.released, true);
  assert.equal(client.releaseError, undefined);
});

test('nonexistent material returns HTTP 400 after rollback', async () => {
  const client = new FakeClient({ existingMaterialIds: [firstMaterialId] });
  const { response } = await captureControllerError(
    client,
    ecoPointId,
    { ...requestBody, material_ids: [firstMaterialId, missingMaterialId] },
  );

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error.message, /materials do not exist/);
  assert.deepEqual(client.statements.map(({ statement }) => statement), [
    'BEGIN',
    'SELECT id FROM public.eco_point WHERE id = $1::uuid FOR UPDATE;',
    'SELECT id FROM public.material WHERE id = ANY($1::uuid[]);',
    'ROLLBACK',
  ]);
  assert.equal(client.released, true);
  assert.equal(client.releaseError, undefined);
});

test('update, relationship removal/insertion, and final-query failures roll back and return HTTP 503', async () => {
  for (const failAt of ['update', 'delete', 'insert', 'details']) {
    const client = new FakeClient({ failAt });
    const { response, caughtError } = await captureControllerError(client, ecoPointId, requestBody);

    assert.equal(response.statusCode, 503, `expected HTTP 503 when ${failAt} fails`);
    assert.equal(caughtError.cause, client.originalError);
    assert.equal(client.statements.at(-1).statement, 'ROLLBACK');
    assert.equal(client.released, true);
    assert.equal(client.releaseError, undefined);
  }
});

test('rollback failure preserves the original transaction error and discards the connection', async () => {
  const client = new FakeClient({ failAt: 'insert', failRollback: true });
  const { response, caughtError } = await captureControllerError(client, ecoPointId, requestBody);

  assert.equal(response.statusCode, 503);
  assert.equal(caughtError.cause, client.originalError);
  assert.equal(client.statements.at(-1).statement, 'ROLLBACK');
  assert.equal(client.released, true);
  assert.equal(client.releaseError, client.rollbackError);
});
