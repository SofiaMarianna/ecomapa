import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const backendDirectory = fileURLToPath(new URL('../', import.meta.url));
const databaseConfigProbe = `
  import { pool } from './src/config/database.js';
  console.log(JSON.stringify(pool.options.ssl));
  await pool.end();
`;

function runDatabaseConfig({ ssl, caPath } = {}) {
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'ecomapa_test',
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    DB_SSL: ssl ?? 'false',
    CORS_ORIGIN: 'http://localhost:3000',
  };

  if (caPath === undefined) {
    delete env.DB_SSL_CA_PATH;
  } else {
    env.DB_SSL_CA_PATH = caPath;
  }

  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', databaseConfigProbe],
    {
      cwd: backendDirectory,
      encoding: 'utf8',
      env,
    },
  );
}

test('disables SSL without requiring a CA path when DB_SSL=false', () => {
  const result = runDatabaseConfig();

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'false');
});

test('requires a CA path when DB_SSL=true', () => {
  for (const caPath of [undefined, '']) {
    const result = runDatabaseConfig({ ssl: 'true', caPath });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /DB_SSL_CA_PATH is required when DB_SSL=true/);
  }
});

test('loads the CA as UTF-8 and keeps certificate validation enabled', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ecomapa-ca-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const certificate = '-----BEGIN CERTIFICATE-----\nmock-certificate\n-----END CERTIFICATE-----\n';
  const caPath = path.join(directory, 'supabase-root.crt');
  await writeFile(caPath, certificate, 'utf8');

  const result = runDatabaseConfig({ ssl: 'true', caPath });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    ca: certificate,
    rejectUnauthorized: true,
  });
});

test('fails initialization when the CA file cannot be read', () => {
  const result = runDatabaseConfig({
    ssl: 'true',
    caPath: path.join(os.tmpdir(), 'ecomapa-missing-supabase-root.crt'),
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT/);
});
