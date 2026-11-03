// Own file: Jest gives every test file a fresh app (and so a fresh rate-limit counter),
// so using up the 100 requests here does not affect the other test files.
const { api, closeDb, expectError } = require('./helpers');

afterAll(closeDb);

describe('rate limiting (100 requests per minute)', () => {
  it('allows 100 requests, then answers 429 RATE_LIMITED with retry information', async () => {
    // An unknown route is the cheapest request that still passes through the limiter.
    for (let i = 1; i <= 100; i += 1) {
      const res = await api().get('/api/nope');
      expect(res.status).toBe(404);
    }

    const blocked = await api().get('/api/nope');
    expectError(blocked, 429, 'RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('sends standard RateLimit headers', async () => {
    const res = await api().get('/api/nope');
    expect(res.headers['ratelimit-policy']).toBe('100;w=60');
    expect(res.headers).not.toHaveProperty('x-ratelimit-limit'); // legacy headers are off
  });
});
