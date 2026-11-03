const { validationResult, matchedData } = require('express-validator');
const AppError = require('../utils/AppError');

// Runs a list of express-validator rules, then either fails with VALIDATION_ERROR or stores the
// validated (and converted) values on req.valid. Controllers read only req.valid, so fields that
// no rule mentions never reach the database.
function validate(rules) {
  return [
    ...rules,
    (req, _res, next) => {
      const result = validationResult(req);
      if (!result.isEmpty()) {
        const details = result.array({ onlyFirstError: true }).map((err) => ({
          field: err.path ?? null,
          location: err.location ?? 'body',
          message: err.msg,
        }));
        return next(AppError.validation(details[0].message, details));
      }
      req.valid = matchedData(req);
      next();
    },
  ];
}

module.exports = validate;
