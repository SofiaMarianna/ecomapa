import { HttpError } from './httpError.js';

export function notFoundHandler(request, response, next) {
  next(new HttpError(404, 'Route not found'));
}
