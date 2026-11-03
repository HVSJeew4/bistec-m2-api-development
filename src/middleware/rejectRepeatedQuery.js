const AppError = require('../utils/AppError');

// "?page=1&page=2" makes Express return page as an array, which would reach the SQL layer.
// This API never expects a list in the query string, so any repeated parameter is rejected.
function rejectRepeatedQuery(req, _res, next) {
  const repeated = Object.keys(req.query).filter((key) => Array.isArray(req.query[key]));
  if (repeated.length === 0) return next();

  next(
    AppError.validation(
      `Query parameter ${repeated[0]} must be given only once`,
      repeated.map((field) => ({
        field,
        location: 'query',
        message: `${field} must be given only once`,
      })),
    ),
  );
}

module.exports = rejectRepeatedQuery;
