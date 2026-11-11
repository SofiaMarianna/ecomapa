import { HttpError } from '../middlewares/httpError.js';
import { findAllMaterials } from '../repositories/materialRepository.js';

export async function getMaterials() {
  try {
    return await findAllMaterials();
  } catch (error) {
    throw new HttpError(503, 'Service unavailable: database connection failed', { cause: error });
  }
}
