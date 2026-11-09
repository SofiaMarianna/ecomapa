import { HttpError } from '../middlewares/httpError.js';
import { checkDatabaseConnection } from '../repositories/healthRepository.js';

export async function getHealthStatus() {
  try {
    const databaseIsAvailable = await checkDatabaseConnection();
    if (!databaseIsAvailable) {
      throw new Error('The database health query returned an unexpected result');
    }
  } catch (error) {
    throw new HttpError(503, 'Service unavailable: database connection failed', { cause: error });
  }

  return {
    status: 'ok',
    database: 'connected',
  };
}
