const { api, resetData, authHeader, closeDb, expectError, AMARA, KASUN } = require('./helpers');

beforeAll(resetData);
afterAll(closeDb);

describe('GET /api/posts/:id/comments', () => {
  it('lists the comments of a post, oldest first, with author and pagination', async () => {
    const res = await api().get('/api/posts/1/comments');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
    expect(res.body.data.length).toBe(res.body.pagination.total);
    expect(res.body.data[0]).toEqual({
      id: 1,
      content: expect.any(String),
      postId: 1,
      createdAt: expect.any(String),
      author: { id: 2, name: 'Kasun Silva' },
    });
    const dates = res.body.data.map((c) => c.createdAt);
    expect(dates).toEqual([...dates].sort());
  });

  it("returns 404 NOT_FOUND for someone else's draft", async () => {
    expectError(await api().get('/api/posts/16/comments'), 404, 'NOT_FOUND');
  });

  it('returns 404 NOT_FOUND for an unknown post', async () => {
    expectError(await api().get('/api/posts/9999/comments'), 404, 'NOT_FOUND');
  });
});

describe('POST /api/posts/:id/comments', () => {
  it('adds a comment by the caller', async () => {
    const res = await api()
      .post('/api/posts/2/comments')
      .set(authHeader(AMARA))
      .send({ content: '  Nice post!  ' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      content: 'Nice post!',
      postId: 2,
      author: { id: 1, name: 'Amara Perera' },
    });
  });

  it('returns 400 VALIDATION_ERROR for empty content', async () => {
    const res = await api().post('/api/posts/2/comments').set(authHeader(AMARA)).send({});
    expectError(res, 400, 'VALIDATION_ERROR');
  });

  it("returns 404 NOT_FOUND when commenting on someone else's draft", async () => {
    const res = await api()
      .post('/api/posts/16/comments')
      .set(authHeader(KASUN))
      .send({ content: 'x' });
    expectError(res, 404, 'NOT_FOUND');
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    const res = await api().post('/api/posts/2/comments').send({ content: 'x' });
    expectError(res, 401, 'UNAUTHORIZED');
  });
});

describe('PUT /api/comments/:id', () => {
  it('lets the author edit their comment', async () => {
    const res = await api().put('/api/comments/1').set(authHeader(KASUN)).send({ content: 'Edit' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, content: 'Edit' });
  });

  it("returns 403 FORBIDDEN for someone else's comment", async () => {
    const res = await api().put('/api/comments/1').set(authHeader(AMARA)).send({ content: 'x' });
    expectError(res, 403, 'FORBIDDEN');
  });

  it('returns 404 NOT_FOUND for an unknown comment', async () => {
    const res = await api().put('/api/comments/9999').set(authHeader(AMARA)).send({ content: 'x' });
    expectError(res, 404, 'NOT_FOUND');
  });
});

describe('DELETE /api/comments/:id', () => {
  it("returns 403 FORBIDDEN for someone else's comment, even on the caller's own post", async () => {
    // Comment 1 is Kasun's, on Amara's post 1. The brief allows deleting only your own comments.
    expectError(await api().delete('/api/comments/1').set(authHeader(AMARA)), 403, 'FORBIDDEN');
  });

  it('lets the author delete their comment', async () => {
    const res = await api().delete('/api/comments/1').set(authHeader(KASUN));
    expect(res.body).toEqual({ success: true, data: { id: 1 } });

    expectError(await api().delete('/api/comments/1').set(authHeader(KASUN)), 404, 'NOT_FOUND');
  });

  it('returns 401 UNAUTHORIZED without a token', async () => {
    expectError(await api().delete('/api/comments/2'), 401, 'UNAUTHORIZED');
  });
});
