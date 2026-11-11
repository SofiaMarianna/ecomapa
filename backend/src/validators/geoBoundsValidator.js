import { HttpError } from '../middlewares/httpError.js';

const numericValuePattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function parseBound(query, name, minimum, maximum) {
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

export function validateGeoBounds(query) {
  if (query === null || typeof query !== 'object' || Array.isArray(query)) {
    throw new HttpError(400, 'Geographic bounds must be provided as query parameters');
  }

  const west = parseBound(query, 'west', -180, 180);
  const south = parseBound(query, 'south', -90, 90);
  const east = parseBound(query, 'east', -180, 180);
  const north = parseBound(query, 'north', -90, 90);

  if (west >= east) {
    throw new HttpError(400, 'Query parameter "west" must be less than "east"');
  }

  if (south >= north) {
    throw new HttpError(400, 'Query parameter "south" must be less than "north"');
  }

  return { west, south, east, north };
}
