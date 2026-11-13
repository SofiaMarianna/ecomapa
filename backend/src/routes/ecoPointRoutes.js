import { Router } from 'express';
import {
  createEcoPoint,
  getEcoPointById,
  getEcoPoints,
  getNearbyEcoPoints,
} from '../controllers/ecoPointController.js';

const ecoPointRoutes = Router();

ecoPointRoutes.post('/eco-points', createEcoPoint);
ecoPointRoutes.get('/eco-points/nearby', getNearbyEcoPoints);
ecoPointRoutes.get('/eco-points/:id', getEcoPointById);
ecoPointRoutes.get('/eco-points', getEcoPoints);

export { ecoPointRoutes };
