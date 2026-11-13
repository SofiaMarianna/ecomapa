import { HttpError } from '../middlewares/httpError.js';
import {
  createEcoPoint as createEcoPointFromRepository,
  findEcoPointById as findEcoPointByIdFromRepository,
  findEcoPointsNearby as findEcoPointsNearbyFromRepository,
  findEcoPointsWithinBounds,
} from '../repositories/ecoPointRepository.js';
import { validateEcoPointCreate } from '../validators/ecoPointCreateValidator.js';
import { validateGeoBounds } from '../validators/geoBoundsValidator.js';
import { validateGeoCoordinates } from '../validators/geoCoordinatesValidator.js';
import { validateEcoPointId } from '../validators/ecoPointIdValidator.js';

const NEARBY_RADIUS_METERS = 2000;

export async function createEcoPoint(body) {
  const ecoPointData = validateEcoPointCreate(body);
  let result;

  try {
    result = await createEcoPointFromRepository(ecoPointData);
  } catch (error) {
    throw new HttpError(503, 'Service unavailable: database connection failed', { cause: error });
  }

  if (result.missingMaterialIds.length > 0) {
    throw new HttpError(400, 'One or more materials do not exist');
  }

  return result.ecoPoint;
}

export async function getEcoPointById(id) {
  const validatedId = validateEcoPointId(id);
  let ecoPoint;

  try {
    ecoPoint = await findEcoPointByIdFromRepository(validatedId);
  } catch (error) {
    throw new HttpError(503, 'Service unavailable: database connection failed', { cause: error });
  }

  if (ecoPoint === null) {
    throw new HttpError(404, 'Eco point not found');
  }

  return ecoPoint;
}

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
