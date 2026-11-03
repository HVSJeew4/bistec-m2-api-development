const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const { seed } = require('../database/seeds/seed');
const { signToken } = require('../src/utils/jwt');

// Seed facts the tests rely on (see database/seeds/seed.js):
//   user 1 = amara@blogflow.test, user 2 = kasun@blogflow.test
//   posts 1, 6, 11 are Amara's published posts; post 16 is Amara's draft; post 2 is Kasun's
//   comment 1 is Kasun's, on post 1
const AMARA = { id: 1, email: 'amara@blogflow.test' };
const KASUN = { id: 2, email: 'kasun@blogflow.test' };

const api = () => request(app);

// Each test file starts from the same 5/20/50 seed data (the schema is created in globalSetup).
const resetData = () => seed(pool);

const authHeader = (user) => ({ Authorization: `Bearer ${signToken(user)}` });

const closeDb = () => pool.end();

// The error envelope from the brief, with a specific code.
function expectError(res, status, code) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({
    success: false,
    error: expect.objectContaining({ code, message: expect.any(String) }),
  });
}

module.exports = { api, pool, resetData, authHeader, closeDb, expectError, AMARA, KASUN };
