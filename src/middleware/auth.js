const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');
const userModel = require('../models/userModel');

// Reads "Authorization: Bearer <token>", verifies it and loads the user it belongs to.
async function authenticate(req) {
  const parts = (req.headers.authorization || '').trim().split(/\s+/);
  const [scheme, token] = parts;
  // Exactly two parts; HTTP scheme names are case-insensitive, so "bearer" is accepted too.
  if (parts.length !== 2 || scheme.toLowerCase() !== 'bearer') {
    throw AppError.unauthorized('Missing or malformed Authorization header');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw AppError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
    );
  }

  // The token may outlive the account it was issued for.
  const user = await userModel.findById(payload.userId);
  if (!user) throw AppError.unauthorized('User for this token no longer exists');
  return user;
}

// For protected routes: 401 unless a valid token is sent.
async function requireAuth(req, _res, next) {
  req.user = await authenticate(req);
  next();
}

// For public routes that show more to a logged-in user (e.g. their own drafts).
// No header → anonymous; a header that is present but invalid is still rejected.
async function optionalAuth(req, _res, next) {
  if (req.headers.authorization) req.user = await authenticate(req);
  next();
}

module.exports = { requireAuth, optionalAuth };
