import { HttpError } from '../middlewares/httpError.js';

const numericValuePattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function parseCoordinate(query, name, minimum, maximum) {
  const value = query[name];
  if (typeof value !== 'string') {
    throw new HttpError(400, `Query parameter "${name}" must be provided exactly once`);
  }

  const normalizedValue = value.trim();
  if (normalizedValue === '' || !numericValuePattern.test(normalizedValue)) {
    throw new HttpError(400, `Query parameter "${name}" must be a finite number`);
  }

  const number = Number(normalizedValue);
  if (!Number.isFinite(number)) {
    throw new HttpError(400, `Query parameter "${name}" must be a finite number`);
  }

  if (number < minimum || number > maximum) {
    throw new HttpError(400, `Query parameter "${name}" must be between ${minimum} and ${maximum}`);
  }

  return number;
}

export function validateGeoCoordinates(query) {
  if (query === null || typeof query !== 'object' || Array.isArray(query)) {
    throw new HttpError(400, 'Geographic coordinates must be provided as query parameters');
  }

  const latitude = parseCoordinate(query, 'lat', -90, 90);
  const longitude = parseCoordinate(query, 'lng', -180, 180);

  return { latitude, longitude };
}
