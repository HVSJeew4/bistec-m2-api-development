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

module.exports = {
  env,
  isTest,
  databaseUrl,
  port: Number(process.env.PORT) || 3000,
  required,
};
