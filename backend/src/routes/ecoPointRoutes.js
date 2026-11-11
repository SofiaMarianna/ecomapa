import { Router } from 'express';
import { getEcoPoints } from '../controllers/ecoPointController.js';

const ecoPointRoutes = Router();

ecoPointRoutes.get('/eco-points', getEcoPoints);

export { ecoPointRoutes };
