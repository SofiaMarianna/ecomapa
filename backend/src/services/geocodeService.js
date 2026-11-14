import { NominatimClientError, nominatimClient } from '../clients/nominatimClient.js';
import { HttpError } from '../middlewares/httpError.js';
import { validateGeocodeCoordinates } from '../validators/geocodeCoordinatesValidator.js';
import { validateGeocodeSearch } from '../validators/geocodeSearchValidator.js';

const providerErrorMessages = new Map([
  [502, 'Geocoding provider communication failed'],
  [503, 'Geocoding provider unavailable'],
  [504, 'Geocoding provider request timed out'],
]);

function rethrowProviderError(error) {
  if (error instanceof NominatimClientError) {
    throw new HttpError(
      error.statusCode,
      providerErrorMessages.get(error.statusCode),
      { cause: error },
    );
  }

  throw error;
}

function mapResult(result) {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new NominatimClientError(502, 'Geocoding provider returned an invalid result', {
      cause: new TypeError('Expected a geocoding result object'),
    });
  }

  const isCoordinate = (value, minimum, maximum) => (
    (typeof value === 'string' || typeof value === 'number')
    && (typeof value !== 'string' || value.trim() !== '')
    && Number.isFinite(Number(value))
    && Number(value) >= minimum
    && Number(value) <= maximum
  );

  if (!isCoordinate(result.lat, -90, 90) || !isCoordinate(result.lon, -180, 180)) {
    throw new NominatimClientError(502, 'Geocoding provider returned invalid coordinates', {
      cause: new TypeError('Geocoding result coordinates must be finite numbers'),
    });
  }

  if (
    result.address != null
    && (typeof result.address !== 'object' || Array.isArray(result.address))
  ) {
    throw new NominatimClientError(502, 'Geocoding provider returned an invalid address', {
      cause: new TypeError('Expected an address object'),
    });
  }

  const lat = Number(result.lat);
  const lon = Number(result.lon);

  return {
    lat,
    lon,
    display_name: result.display_name ?? null,
    osm_type: result.osm_type ?? null,
    osm_id: result.osm_id == null ? null : String(result.osm_id),
    category: result.category ?? null,
    type: result.type ?? null,
    address: result.address ?? null,
  };
}

export function createGeocodeService(client = nominatimClient) {
  return Object.freeze({
    async search(query) {
      const normalizedQuery = validateGeocodeSearch(query);
      let results;

      try {
        results = await client.search(normalizedQuery);
      } catch (error) {
        rethrowProviderError(error);
      }

      if (!Array.isArray(results)) {
        rethrowProviderError(
          new NominatimClientError(
            502,
            'Geocoding provider returned an invalid result list',
            {
              cause: new TypeError('Expected a search result array'),
            },
          ),
        );
      }

      try {
        return results.map(mapResult);
      } catch (error) {
        rethrowProviderError(error);
      }
    },

    async reverse(query) {
      const coordinates = validateGeocodeCoordinates(query);
      let result;

      try {
        result = await client.reverse(coordinates.lat, coordinates.lon);
      } catch (error) {
        rethrowProviderError(error);
      }

      if (result === null || (typeof result === 'object' && typeof result.error === 'string')) {
        throw new HttpError(404, 'Address not found');
      }

      try {
        return mapResult(result);
      } catch (error) {
        rethrowProviderError(error);
      }
    },
  });
}

const geocodeService = createGeocodeService();

export const searchGeocode = geocodeService.search;
export const reverseGeocode = geocodeService.reverse;