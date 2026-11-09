import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';

const server = createServer(app);
let shutdownStarted = false;

function listen() {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.PORT, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
}

async function shutdown(signal) {
  if (shutdownStarted) return;
  shutdownStarted = true;

  console.info(`Received ${signal}; shutting down gracefully.`);

  const shutdownTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    server.closeAllConnections();
    process.exitCode = 1;
  }, 10000);
  shutdownTimeout.unref();

  try {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await pool.end();
  } catch (error) {
    const errorIdentifier = error.code ?? error.name;
    console.error(`Error during graceful shutdown (${errorIdentifier}).`);
    process.exitCode = 1;
  } finally {
    clearTimeout(shutdownTimeout);
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await listen();
  console.info(`EcoMapa API listening on port ${env.PORT} (${env.NODE_ENV}).`);
} catch (error) {
  const errorIdentifier = error.code ?? error.name;
  console.error(`Unable to start EcoMapa API (${errorIdentifier}).`);
  await pool.end();
  process.exitCode = 1;
}
