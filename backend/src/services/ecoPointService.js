import { HttpError } from '../middlewares/httpError.js';
import { findEcoPointsWithinBounds } from '../repositories/ecoPointRepository.js';
import { validateGeoBounds } from '../validators/geoBoundsValidator.js';

export async function getEcoPoints(query) {
  const bounds = validateGeoBounds(query);

  try {
    return await findEcoPointsWithinBounds(bounds);
  } catch (error) {
    throw new HttpError(503, 'Service unavailable: database connection failed', { cause: error });
  }
}
