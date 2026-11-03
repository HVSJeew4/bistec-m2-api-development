const jwt = require('jsonwebtoken');
const { required } = require('../config');

const EXPIRES_IN = '24h';

// Read on each call (not at import) so scripts like db:migrate do not need JWT_SECRET.
function secret() {
  return required('JWT_SECRET');
}

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, secret(), { expiresIn: EXPIRES_IN });
}

// Returns the payload, or throws (TokenExpiredError / JsonWebTokenError) if the token is invalid.
// The algorithm is pinned so a token cannot pick a weaker one in its own header.
function verifyToken(token) {
  return jwt.verify(token, secret(), { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken, EXPIRES_IN };
