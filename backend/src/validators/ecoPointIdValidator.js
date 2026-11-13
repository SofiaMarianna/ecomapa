import { HttpError } from '../middlewares/httpError.js';
import { isCanonicalUuid } from './uuidValidator.js';

export function validateEcoPointId(id) {
  if (!isCanonicalUuid(id)) {
    throw new HttpError(400, 'Eco point id must be a valid UUID');
  }

  return id;
}
