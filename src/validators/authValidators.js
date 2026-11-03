const { body } = require('express-validator');
const { text } = require('./common');

// Lower-casing (rather than express-validator's normalizeEmail) keeps the address exactly as typed
// apart from case; normalizeEmail would also strip dots and "+tags" from Gmail addresses.
const email = () =>
  body('email')
    .exists({ values: 'falsy' })
    .withMessage('Email is required')
    .bail()
    .isString()
    .trim()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be at most 255 characters')
    .toLowerCase();

const register = [
  email(),
  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string')
    .bail()
    // bcrypt only uses the first 72 bytes of a password, so longer ones are refused, not cut.
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8 to 72 characters'),
  text('name', 100),
  body('bio')
    .optional({ values: 'null' })
    .isString()
    .withMessage('bio must be a string')
    .bail()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('bio must be at most 2000 characters'),
];

const login = [
  email(),
  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string'),
];

module.exports = { register, login };
