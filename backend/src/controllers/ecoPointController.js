import { getEcoPoints as getEcoPointsFromService } from '../services/ecoPointService.js';

export async function getEcoPoints(request, response) {
  const ecoPoints = await getEcoPointsFromService(request.query);
  response.status(200).json({ data: ecoPoints });
}
