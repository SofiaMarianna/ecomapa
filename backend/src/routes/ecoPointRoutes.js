import { Router } from 'express';
import {
  createEcoPoint,
  getEcoPointById,
  getEcoPoints,
  getNearbyEcoPoints,
  updateEcoPoint,
} from '../controllers/ecoPointController.js';

const ecoPointRoutes = Router();

ecoPointRoutes.post('/eco-points', createEcoPoint);
ecoPointRoutes.put('/eco-points/:id', updateEcoPoint);
ecoPointRoutes.get('/eco-points/nearby', getNearbyEcoPoints);
ecoPointRoutes.get('/eco-points/:id', getEcoPointById);
ecoPointRoutes.get('/eco-points', getEcoPoints);

export { ecoPointRoutes };
