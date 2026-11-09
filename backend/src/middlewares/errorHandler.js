import { HttpError } from './httpError.js';

const bodyParserErrors = new Map([
  ['entity.parse.failed', { statusCode: 400, message: 'Malformed JSON request body' }],
  ['entity.too.large', { statusCode: 413, message: 'Request body too large' }],
]);

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const bodyParserError = bodyParserErrors.get(error.type);
  const isHttpError = error instanceof HttpError;
  const statusCode = isHttpError ? error.statusCode : bodyParserError?.statusCode ?? 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    const errorIdentifier = error.cause?.code ?? error.cause?.name ?? error.code ?? error.name;
    console.error(`API request failed with status ${statusCode} (${errorIdentifier}).`);
  }

  response.status(statusCode).json({
    error: {
      message: isHttpError
        ? error.message
        : bodyParserError?.message ?? 'Internal server error',
    },
  });
}
