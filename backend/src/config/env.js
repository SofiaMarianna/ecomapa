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

const dbSsl = parseBoolean('DB_SSL', process.env.DB_SSL ?? 'false');
const dbSslCaPath = process.env.DB_SSL_CA_PATH;
if (dbSsl && (typeof dbSslCaPath !== 'string' || dbSslCaPath.trim() === '')) {
  throw new Error('DB_SSL_CA_PATH is required when DB_SSL=true');
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

function parseNominatimBaseUrl(value) {
  try {
    const parsedUrl = new URL(value);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.search || parsedUrl.hash) {
      throw new Error();
    }
    return parsedUrl.href.replace(/\/+$/, '');
  } catch {
    throw new Error('NOMINATIM_BASE_URL must be a valid HTTP or HTTPS URL without a query or fragment');
  }
}

function parseNominatimUserAgent(value) {
  const userAgent = value.trim();

  if (
    userAgent === ''
    || /[\r\n]/.test(userAgent)
    || !/^EcoMapa(?:\/|\s)/i.test(userAgent)
  ) {
    throw new Error('NOMINATIM_USER_AGENT must identify EcoMapa and must not contain line breaks');
  }

  return userAgent;
}

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  PORT: parseInteger('PORT', process.env.PORT ?? '3000', { min: 1, max: 65535 }),
  DB_HOST: process.env.DB_HOST.trim(),
  DB_PORT: parseInteger('DB_PORT', process.env.DB_PORT, { min: 1, max: 65535 }),
  DB_NAME: process.env.DB_NAME.trim(),
  DB_USER: process.env.DB_USER.trim(),
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_SSL: dbSsl,
  DB_SSL_CA_PATH: dbSslCaPath,
  CORS_ORIGIN: corsOrigin,
  NOMINATIM_BASE_URL: parseNominatimBaseUrl(
  process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org',
),
NOMINATIM_USER_AGENT: parseNominatimUserAgent(
  process.env.NOMINATIM_USER_AGENT ?? 'EcoMapa/1.0',
),
});
