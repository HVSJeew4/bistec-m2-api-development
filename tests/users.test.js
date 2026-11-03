const { api, resetData, authHeader, closeDb, expectError, AMARA } = require('./helpers');

beforeAll(resetData);
afterAll(closeDb);

describe('GET /api/users/me', () => {
  it('returns the logged-in user, including email', async () => {
    const res = await api().get('/api/users/me').set(authHeader(AMARA));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, email: AMARA.email, name: 'Amara Perera' });
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    expectError(await api().get('/api/users/me'), 401, 'UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED for an invalid token', async () => {
    const res = await api().get('/api/users/me').set('Authorization', 'Bearer not.a.jwt');
    expectError(res, 401, 'UNAUTHORIZED');
  });
});

describe('PUT /api/users/me', () => {
  it('updates name and bio, ignoring fields that cannot be changed here', async () => {
    const res = await api()
      .put('/api/users/me')
      .set(authHeader(AMARA))
      .send({ name: '  Amara P.  ', bio: 'Updated bio', email: 'hacker@example.com', id: 99 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: 1,
      email: AMARA.email,
      name: 'Amara P.',
      bio: 'Updated bio',
    });
  });

  it('clears the bio when null is sent', async () => {
    const res = await api().put('/api/users/me').set(authHeader(AMARA)).send({ bio: null });
    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBeNull();
  });

  it('returns 400 VALIDATION_ERROR when no updatable field is sent', async () => {
    const res = await api().put('/api/users/me').set(authHeader(AMARA)).send({ email: 'x@y.z' });
    expectError(res, 400, 'VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR for an empty name', async () => {
    const res = await api().put('/api/users/me').set(authHeader(AMARA)).send({ name: '   ' });
    expectError(res, 400, 'VALIDATION_ERROR');
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    expectError(await api().put('/api/users/me').send({ name: 'X' }), 401, 'UNAUTHORIZED');
  });
});

describe('GET /api/users/:id', () => {
  it('returns the public profile without email', async () => {
    const res = await api().get('/api/users/2');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: 2,
      name: 'Kasun Silva',
      bio: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it('returns 404 NOT_FOUND for an unknown user', async () => {
    expectError(await api().get('/api/users/999'), 404, 'NOT_FOUND');
  });

  it('returns 400 VALIDATION_ERROR for a non-numeric id', async () => {
    expectError(await api().get('/api/users/abc'), 400, 'VALIDATION_ERROR');
  });
});

describe('GET /api/users/:id/posts', () => {
  it("lists only the author's published posts, paginated", async () => {
    const res = await api().get('/api/users/1/posts?limit=2');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data).toHaveLength(2);
    for (const post of res.body.data) {
      expect(post.author.id).toBe(1);
      expect(post.published).toBe(true);
    }
  });

  it('returns 404 NOT_FOUND for an unknown user', async () => {
    expectError(await api().get('/api/users/999/posts'), 404, 'NOT_FOUND');
  });
});
