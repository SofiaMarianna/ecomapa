import { Router } from 'express';
import {
  getEcoPointById,
  getEcoPoints,
  getNearbyEcoPoints,
} from '../controllers/ecoPointController.js';

const ecoPointRoutes = Router();

ecoPointRoutes.get('/eco-points/nearby', getNearbyEcoPoints);
ecoPointRoutes.get('/eco-points/:id', getEcoPointById);
ecoPointRoutes.get('/eco-points', getEcoPoints);

export { ecoPointRoutes };
