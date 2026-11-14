import { Router } from 'express';
import { ecoPointRoutes } from './ecoPointRoutes.js';
import { geocodeRoutes } from './geocodeRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { materialRoutes } from './materialRoutes.js';

const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(materialRoutes);
apiRoutes.use(geocodeRoutes);
apiRoutes.use(ecoPointRoutes);

export { apiRoutes };
