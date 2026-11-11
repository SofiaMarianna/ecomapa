import { Router } from 'express';
import { getMaterials } from '../controllers/materialController.js';

const materialRoutes = Router();

materialRoutes.get('/materials', getMaterials);

export { materialRoutes };
