import { Router } from 'express';
import { healthRoutes } from './healthRoutes.js';

const apiRoutes = Router();

apiRoutes.use(healthRoutes);

export { apiRoutes };
