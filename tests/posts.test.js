const { api, resetData, authHeader, closeDb, expectError, AMARA, KASUN } = require('./helpers');

beforeAll(resetData);
afterAll(closeDb);

describe('GET /api/posts', () => {
  it('lists published posts newest first with default pagination', async () => {
    const res = await api().get('/api/posts');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 15, totalPages: 2 });
    expect(res.body.data).toHaveLength(10);
    expect(res.body.data.every((p) => p.published)).toBe(true);

    const dates = res.body.data.map((p) => p.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('embeds the author id and name in each post', async () => {
    const res = await api().get('/api/posts?limit=1');
    expect(res.body.data[0].author).toEqual({ id: expect.any(Number), name: expect.any(String) });
  });

  it('returns the requested page', async () => {
    const res = await api().get('/api/posts?page=2&limit=10');
    expect(res.body.data).toHaveLength(5);
    expect(res.body.pagination).toMatchObject({ page: 2, total: 15 });
  });

  it('filters by author_id', async () => {
    const res = await api().get('/api/posts?author_id=1');
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.data.every((p) => p.author.id === 1)).toBe(true);
  });

  it('filters by a case-insensitive title search', async () => {
    const res = await api().get('/api/posts?search=JWT');
    expect(res.body.data.map((p) => p.title)).toEqual(['JWT in plain words']);
  });

  it('treats % in a search as a literal character', async () => {
    const res = await api().get('/api/posts?search=%25');
    expect(res.body.pagination.total).toBe(0);
  });

  it('sorts oldest first with sort=asc', async () => {
    const res = await api().get('/api/posts?sort=asc&limit=1');
    expect(res.body.data[0].id).toBe(1);
  });

  it("lists only the caller's own drafts with published=false", async () => {
    const res = await api().get('/api/posts?published=false').set(authHeader(AMARA));
    expect(res.body.data.map((p) => p.id)).toEqual([16]);
  });

  it('returns 401 for published=false without a token', async () => {
    expectError(await api().get('/api/posts?published=false'), 401, 'UNAUTHORIZED');
  });

  it.each([['page=0'], ['limit=101'], ['sort=sideways'], ['author_id=x'], ['published=maybe']])(
    'returns 400 VALIDATION_ERROR for %s',
    async (query) => {
      expectError(await api().get(`/api/posts?${query}`), 400, 'VALIDATION_ERROR');
    },
  );
});

describe('GET /api/posts/:id', () => {
  it('returns a published post', async () => {
    const res = await api().get('/api/posts/1');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, published: true, author: { id: 1 } });
  });

  it('returns 404 for a draft to anyone but its author', async () => {
    expectError(await api().get('/api/posts/16'), 404, 'NOT_FOUND');
    expectError(await api().get('/api/posts/16').set(authHeader(KASUN)), 404, 'NOT_FOUND');

    const own = await api().get('/api/posts/16').set(authHeader(AMARA));
    expect(own.status).toBe(200);
  });

  it('returns 404 NOT_FOUND for an unknown post', async () => {
    expectError(await api().get('/api/posts/9999'), 404, 'NOT_FOUND');
  });

  it('returns 400 VALIDATION_ERROR for an id out of integer range', async () => {
    expectError(await api().get('/api/posts/99999999999'), 400, 'VALIDATION_ERROR');
  });
});

describe('POST /api/posts', () => {
  it('creates a draft by default, owned by the caller', async () => {
    const res = await api()
      .post('/api/posts')
      .set(authHeader(KASUN))
      .send({ title: '  New post  ', content: 'Body text', author_id: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'New post',
      content: 'Body text',
      published: false,
      author: { id: 2, name: 'Kasun Silva' }, // author_id from the body is ignored
    });
  });

  it('creates a published post when published is true', async () => {
    const res = await api()
      .post('/api/posts')
      .set(authHeader(KASUN))
      .send({ title: 'Live', content: 'Now', published: true });
    expect(res.body.data.published).toBe(true);
  });

  it('returns 400 VALIDATION_ERROR for missing title and a non-boolean published', async () => {
    const res = await api()
      .post('/api/posts')
      .set(authHeader(KASUN))
      .send({ content: 'x', published: 'yes' });

    expectError(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toEqual(['title', 'published']);
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    const res = await api().post('/api/posts').send({ title: 'x', content: 'y' });
    expectError(res, 401, 'UNAUTHORIZED');
  });
});

describe('PUT /api/posts/:id', () => {
  it('lets the author update some fields', async () => {
    const res = await api().put('/api/posts/6').set(authHeader(AMARA)).send({ title: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 6, title: 'Renamed', published: true });
    expect(res.body.data.updatedAt > res.body.data.createdAt).toBe(true);
  });

  it('can publish a draft', async () => {
    const res = await api().put('/api/posts/16').set(authHeader(AMARA)).send({ published: true });
    expect(res.body.data.published).toBe(true);
  });

  it("returns 403 FORBIDDEN for someone else's published post", async () => {
    const res = await api().put('/api/posts/1').set(authHeader(KASUN)).send({ title: 'Mine now' });
    expectError(res, 403, 'FORBIDDEN');
  });

  it("returns 404 NOT_FOUND for someone else's draft", async () => {
    const res = await api().put('/api/posts/12').set(authHeader(AMARA)).send({ title: 'x' });
    expectError(res, 404, 'NOT_FOUND');
  });

  it('returns 400 VALIDATION_ERROR for an empty update', async () => {
    const res = await api().put('/api/posts/1').set(authHeader(AMARA)).send({});
    expectError(res, 400, 'VALIDATION_ERROR');
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    expectError(await api().put('/api/posts/1').send({ title: 'x' }), 401, 'UNAUTHORIZED');
  });
});

describe('DELETE /api/posts/:id', () => {
  it("returns 403 FORBIDDEN for someone else's post", async () => {
    expectError(await api().delete('/api/posts/1').set(authHeader(KASUN)), 403, 'FORBIDDEN');
  });

  it('lets the author delete a post, together with its comments', async () => {
    const res = await api().delete('/api/posts/1').set(authHeader(AMARA));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: 1 } });
    expectError(await api().get('/api/posts/1'), 404, 'NOT_FOUND');
    expectError(await api().get('/api/posts/1/comments'), 404, 'NOT_FOUND');
  });

  it('returns 404 NOT_FOUND when the post does not exist', async () => {
    expectError(await api().delete('/api/posts/1').set(authHeader(AMARA)), 404, 'NOT_FOUND');
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    expectError(await api().delete('/api/posts/2'), 401, 'UNAUTHORIZED');
  });
});
