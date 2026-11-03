const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

const EXPIRES_IN = '24h';

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, jwtSecret(), { expiresIn: EXPIRES_IN });
}

// Returns the payload, or throws (TokenExpiredError / JsonWebTokenError) if the token is invalid.
// The algorithm is pinned so a token cannot pick a weaker one (or "none") in its own header.
function verifyToken(token) {
  return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken, EXPIRES_IN };
