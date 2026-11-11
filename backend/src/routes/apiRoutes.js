import { Router } from 'express';
import { healthRoutes } from './healthRoutes.js';
import { materialRoutes } from './materialRoutes.js';

const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(materialRoutes);

export { apiRoutes };
