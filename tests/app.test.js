const { api, pool, closeDb, expectError } = require('./helpers');

afterAll(closeDb);

describe('GET /api/health', () => {
  it('reports the API and database as up', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', database: 'up' } });
  });

  it('returns 503 SERVICE_UNAVAILABLE when the database query fails', async () => {
    const spy = jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('connection refused'));
    expectError(await api().get('/api/health'), 503, 'SERVICE_UNAVAILABLE');
    spy.mockRestore();
  });
});

describe('error handling', () => {
  it('returns 404 NOT_FOUND in the error envelope for an unknown route', async () => {
    const res = await api().get('/api/nope');
    expectError(res, 404, 'NOT_FOUND');
    expect(res.body.error.message).toBe('Route GET /api/nope not found');
  });

  it('returns 500 INTERNAL_ERROR without leaking details for unexpected errors', async () => {
    const spy = jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('secret SQL detail'));
    const res = await api().get('/api/posts/1');

    expectError(res, 500, 'INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret SQL detail');
    spy.mockRestore();
  });
});
