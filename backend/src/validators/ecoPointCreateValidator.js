import { HttpError } from '../middlewares/httpError.js';
import { isCanonicalUuid } from './uuidValidator.js';

const allowedProperties = new Set([
  'name',
  'address',
  'description',
  'latitude',
  'longitude',
  'material_ids',
]);

function validateRequiredText(body, property, { maxLength } = {}) {
  const value = body[property];
  if (typeof value !== 'string') {
    throw new HttpError(400, `"${property}" must be a non-empty string`);
  }

  const normalizedValue = value.trim();
  if (normalizedValue === '') {
    throw new HttpError(400, `"${property}" must be a non-empty string`);
  }

  if (maxLength !== undefined && Array.from(normalizedValue).length > maxLength) {
    throw new HttpError(400, `"${property}" must not exceed ${maxLength} characters`);
  }

  return normalizedValue;
}

function validateCoordinate(body, property, minimum, maximum) {
  const value = body[property];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(400, `"${property}" must be a finite JSON number`);
  }

  if (value < minimum || value > maximum) {
    throw new HttpError(400, `"${property}" must be between ${minimum} and ${maximum}`);
  }

  return value;
}

function validateMaterialIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, '"material_ids" must be a non-empty array of UUIDs');
  }

  const normalizedIds = value.map((id, index) => {
    if (!isCanonicalUuid(id)) {
      throw new HttpError(400, `"material_ids[${index}]" must be a valid UUID`);
    }

    return id.toLowerCase();
  });

  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new HttpError(400, '"material_ids" must not contain duplicate UUIDs');
  }

  return normalizedIds;
}

export function validateEcoPointCreate(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }

  const unexpectedProperties = Object.keys(body).filter((property) => !allowedProperties.has(property));
  if (unexpectedProperties.length > 0) {
    throw new HttpError(400, `Unexpected request property "${unexpectedProperties[0]}"`);
  }

  let description = body.description ?? null;
  if (description !== null) {
    if (typeof description !== 'string') {
      throw new HttpError(400, '"description" must be a string or null');
    }

    description = description.trim() || null;
  }

  return {
    name: validateRequiredText(body, 'name', { maxLength: 120 }),
    address: validateRequiredText(body, 'address'),
    description,
    latitude: validateCoordinate(body, 'latitude', -90, 90),
    longitude: validateCoordinate(body, 'longitude', -180, 180),
    materialIds: validateMaterialIds(body.material_ids),
  };
}
