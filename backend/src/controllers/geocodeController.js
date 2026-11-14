import {
  reverseGeocode as reverseGeocodeFromService,
  searchGeocode as searchGeocodeFromService,
} from '../services/geocodeService.js';

export function createGeocodeController(service = {
  search: searchGeocodeFromService,
  reverse: reverseGeocodeFromService,
}) {
  return Object.freeze({
    async searchGeocode(request, response) {
      const results = await service.search(request.query);
      response.status(200).json({ data: results });
    },

    async reverseGeocode(request, response) {
      const result = await service.reverse(request.query);
      response.status(200).json({ data: result });
    },
  });
}

const geocodeController = createGeocodeController();

export const { searchGeocode, reverseGeocode } = geocodeController;
