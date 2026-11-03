const { body, oneOf, param } = require('express-validator');
const { stripHtml } = require('../utils/sanitize');

const MAX_INT = 2147483647; // PostgreSQL INTEGER / SERIAL upper bound

// :id path parameter. Out-of-range ids would otherwise reach PostgreSQL and fail there.
const idParam = (name = 'id') =>
  param(name)
    .isInt({ min: 1, max: MAX_INT })
    .withMessage(`${name} must be a positive integer`)
    .toInt();

// For partial updates: at least one of the listed fields must be present.
// (oneOf, not body().custom: a rule on the whole body would copy every sent field into req.valid.)
const atLeastOne = (fields) =>
  oneOf(
    fields.map((field) => body(field).exists()),
    { message: `Provide at least one of: ${fields.join(', ')}` },
  );

// Required (or optional) non-empty plain-text string with a maximum length.
// HTML is stripped *before* the empty check, so "<script>…</script>" alone counts as empty.
const text = (field, max, { optional = false } = {}) => {
  const chain = body(field);
  if (optional) chain.optional();
  return chain
    .exists({ values: 'null' })
    .withMessage(`${field} is required`)
    .bail()
    .isString()
    .withMessage(`${field} must be a string`)
    .bail()
    .customSanitizer(stripHtml)
    .trim()
    .notEmpty()
    .withMessage(`${field} must not be empty`)
    .isLength({ max })
    .withMessage(`${field} must be at most ${max} characters`);
};

module.exports = { idParam, atLeastOne, text, MAX_INT };
