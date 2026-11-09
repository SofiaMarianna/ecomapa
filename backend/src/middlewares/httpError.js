export class HttpError extends Error {
  constructor(statusCode, message, options = {}) {
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new RangeError('HttpError statusCode must be an integer between 400 and 599');
    }

    super(message, options);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}
