import { Router } from 'express';
import { ecoPointRoutes } from './ecoPointRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { materialRoutes } from './materialRoutes.js';

const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(materialRoutes);
apiRoutes.use(ecoPointRoutes);

export { apiRoutes };
