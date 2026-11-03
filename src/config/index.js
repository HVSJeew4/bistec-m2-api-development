require('dotenv').config({ quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  }
  return value;
}

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

// Tests wipe their database, so they must never run against the main one.
const databaseUrl = isTest ? required('TEST_DATABASE_URL') : required('DATABASE_URL');
if (isTest && databaseUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must point to a different database than DATABASE_URL');
}

const MIN_JWT_SECRET_LENGTH = 32;

// A function (not a value read at import) so scripts such as db:migrate run without JWT_SECRET.
// A short secret could be brute-forced, which would let anyone forge tokens for any user.
function jwtSecret() {
  const secret = required('JWT_SECRET');
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
  }
  return secret;
}

module.exports = {
  env,
  isTest,
  databaseUrl,
  port: Number(process.env.PORT) || 3000,
  rateLimit: { limit: 100, windowMs: 60 * 1000 },
  jwtSecret,
  required,
};
