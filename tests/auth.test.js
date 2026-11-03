const { api, pool, resetData, closeDb, expectError } = require('./helpers');
const { verifyToken } = require('../src/utils/jwt');

beforeAll(resetData);
afterAll(closeDb);

const newUser = { email: 'New.User@Example.com', password: 'secret123', name: 'New User' };

describe('POST /api/auth/register', () => {
  it('creates a user and returns it without the password hash', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newUser, bio: '  Hello  ' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      id: expect.any(Number),
      email: 'new.user@example.com', // trimmed and lower-cased
      name: 'New User',
      bio: 'Hello',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('stores a bcrypt hash, not the password', async () => {
    const { rows } = await pool.query(`SELECT password_hash FROM users WHERE email = $1`, [
      'new.user@example.com',
    ]);
    expect(rows[0].password_hash).toMatch(/^\$2b\$10\$/);
  });

  it('returns 409 CONFLICT for an email that is already registered (any case)', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newUser, email: 'NEW.USER@example.com' });
    expectError(res, 409, 'CONFLICT');
  });

  it('returns 400 VALIDATION_ERROR with details for each invalid field', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    expectError(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toEqual(['email', 'password', 'name']);
  });

  it('returns "Email is required" when email is missing', async () => {
    const res = await api().post('/api/auth/register').send({ password: 'secret123', name: 'X' });
    expectError(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Email is required');
  });

  it('returns 400 VALIDATION_ERROR for a body that is not valid JSON', async () => {
    const res = await api()
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expectError(res, 400, 'VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('returns a 24h JWT and the user for correct credentials', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'amara@blogflow.test', password: process.env.SEED_USER_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: 1, email: 'amara@blogflow.test' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const payload = verifyToken(res.body.data.token);
    expect(payload).toMatchObject({ userId: 1, email: 'amara@blogflow.test' });
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await api()
      .post('/api/auth/login')
      .send({ email: 'amara@blogflow.test', password: 'wrong-password' });
    const unknownEmail = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody@blogflow.test', password: 'wrong-password' });

    expectError(wrongPassword, 401, 'UNAUTHORIZED');
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('returns 400 VALIDATION_ERROR when the password is missing', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'amara@blogflow.test' });
    expectError(res, 400, 'VALIDATION_ERROR');
  });
});
