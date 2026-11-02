module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Rebuilds the test database (TEST_DATABASE_URL) once before the whole run.
  globalSetup: '<rootDir>/tests/globalSetup.js',
  collectCoverageFrom: ['src/**/*.js', 'scripts/**/*.js', 'database/**/*.js'],
};
