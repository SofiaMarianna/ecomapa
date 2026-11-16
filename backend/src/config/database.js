import { readFileSync } from 'node:fs';
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;
const ssl = env.DB_SSL
  ? {
    ca: readFileSync(env.DB_SSL_CA_PATH, 'utf8'),
    rejectUnauthorized: true,
  }
  : false;

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  allowExitOnIdle: false,
});

pool.on('error', (error) => {
  const errorIdentifier = error.code ?? error.name;
  console.error(`Unexpected error from an idle PostgreSQL client (${errorIdentifier}).`);
});
