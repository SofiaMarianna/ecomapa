import 'dotenv/config';

const requiredVariables = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'CORS_ORIGIN',
];

const missingVariables = requiredVariables.filter((name) => {
  const value = process.env[name];
  return typeof value !== 'string' || value.trim() === '';
});

if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

function parseInteger(name, value, { min, max }) {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < min || parsedValue > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsedValue;
}

function parseBoolean(name, value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be either "true" or "false"`);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production');
}

const corsOrigin = process.env.CORS_ORIGIN.trim();
try {
  const parsedOrigin = new URL(corsOrigin);
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== corsOrigin) {
    throw new Error();
  }
} catch {
  throw new Error('CORS_ORIGIN must be a valid HTTP or HTTPS origin without a path');
}

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  PORT: parseInteger('PORT', process.env.PORT ?? '3000', { min: 1, max: 65535 }),
  DB_HOST: process.env.DB_HOST.trim(),
  DB_PORT: parseInteger('DB_PORT', process.env.DB_PORT, { min: 1, max: 65535 }),
  DB_NAME: process.env.DB_NAME.trim(),
  DB_USER: process.env.DB_USER.trim(),
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_SSL: parseBoolean('DB_SSL', process.env.DB_SSL ?? 'false'),
  CORS_ORIGIN: corsOrigin,
});
