import { HttpError } from '../middlewares/httpError.js';
import {
  findEcoPointsNearby as findEcoPointsNearbyFromRepository,
  findEcoPointsWithinBounds,
} from '../repositories/ecoPointRepository.js';
import { validateGeoBounds } from '../validators/geoBoundsValidator.js';
import { validateGeoCoordinates } from '../validators/geoCoordinatesValidator.js';

const NEARBY_RADIUS_METERS = 2000;

export async function getEcoPoints(query) {
  const bounds = validateGeoBounds(query);

  try {
    return await findEcoPointsWithinBounds(bounds);
  } catch (error) {
    throw new HttpError(503, 'Service unavailable: database connection failed', { cause: error });
  }
}

export async function getNearbyEcoPoints(query) {
  const coordinates = validateGeoCoordinates(query);

  try {
    return await findEcoPointsNearbyFromRepository({
      ...coordinates,
      radiusMeters: NEARBY_RADIUS_METERS,
    });
  } catch (error) {
    throw new HttpError(503, 'Service unavailable: database connection failed', { cause: error });
  }
}
