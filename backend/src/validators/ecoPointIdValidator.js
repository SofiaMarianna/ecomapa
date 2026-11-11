import { HttpError } from '../middlewares/httpError.js';

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function validateEcoPointId(id) {
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    throw new HttpError(400, 'Eco point id must be a valid UUID');
  }

  return id;
}
