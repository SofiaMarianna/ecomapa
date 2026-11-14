import { HttpError } from '../middlewares/httpError.js';

const MAX_QUERY_LENGTH = 200;

export function validateGeocodeSearch(query) {
  if (query === null || typeof query !== 'object' || Array.isArray(query)) {
    throw new HttpError(400, 'Search query must be provided as query parameters');
  }

  const value = query.q;
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Query parameter "q" must be provided exactly once');
  }

  const normalizedQuery = value.trim();
  if (normalizedQuery === '') {
    throw new HttpError(400, 'Query parameter "q" must not be empty');
  }
  if (normalizedQuery.length > MAX_QUERY_LENGTH) {
    throw new HttpError(400, `Query parameter "q" must not exceed ${MAX_QUERY_LENGTH} characters`);
  }

  return normalizedQuery;
}
