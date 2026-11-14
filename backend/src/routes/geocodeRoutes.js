import { Router } from 'express';
import {
  reverseGeocode,
  searchGeocode,
} from '../controllers/geocodeController.js';

const geocodeRoutes = Router();

geocodeRoutes.get('/geocode/search', searchGeocode);
geocodeRoutes.get('/geocode/reverse', reverseGeocode);

export { geocodeRoutes };
