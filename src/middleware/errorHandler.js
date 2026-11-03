const AppError = require('../utils/AppError');
const { isTest } = require('../config');

function errorBody(code, message, details) {
  return { success: false, error: { code, message, ...(details && { details }) } };
}

// For any route that did not match.
function notFound(req, _res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Last middleware: every error ends here and leaves in the same envelope.
// Express 5 also forwards errors thrown or rejected inside async handlers to this function.
// Express recognises error handlers by their 4 arguments, so _next must stay.
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json(errorBody(err.code, err.message, err.details));
  }

  // Raised by express.json() for a body that is not valid JSON.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(errorBody('VALIDATION_ERROR', 'Request body is not valid JSON'));
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json(errorBody('PAYLOAD_TOO_LARGE', 'Request body is too large'));
  }

  // Anything else is a bug or an outage: log it, but never send internals to the client.
  if (!isTest) console.error(err);
  return res.status(500).json(errorBody('INTERNAL_ERROR', 'Something went wrong'));
}

module.exports = { notFound, errorHandler };
