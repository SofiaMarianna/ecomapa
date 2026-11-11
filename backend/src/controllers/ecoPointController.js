import {
  getEcoPoints as getEcoPointsFromService,
  getNearbyEcoPoints as getNearbyEcoPointsFromService,
} from '../services/ecoPointService.js';

export async function getEcoPoints(request, response) {
  const ecoPoints = await getEcoPointsFromService(request.query);
  response.status(200).json({ data: ecoPoints });
}

export async function getNearbyEcoPoints(request, response) {
  const ecoPoints = await getNearbyEcoPointsFromService(request.query);
  response.status(200).json({ data: ecoPoints });
}
