import {
  createEcoPoint as createEcoPointFromService,
  getEcoPointById as getEcoPointByIdFromService,
  getEcoPoints as getEcoPointsFromService,
  getNearbyEcoPoints as getNearbyEcoPointsFromService,
} from '../services/ecoPointService.js';

export async function createEcoPoint(request, response) {
  const ecoPoint = await createEcoPointFromService(request.body);
  response.status(201).json({ data: ecoPoint });
}

export async function getEcoPointById(request, response) {
  const ecoPoint = await getEcoPointByIdFromService(request.params.id);
  response.status(200).json({ data: ecoPoint });
}

export async function getEcoPoints(request, response) {
  const ecoPoints = await getEcoPointsFromService(request.query);
  response.status(200).json({ data: ecoPoints });
}

export async function getNearbyEcoPoints(request, response) {
  const ecoPoints = await getNearbyEcoPointsFromService(request.query);
  response.status(200).json({ data: ecoPoints });
}
