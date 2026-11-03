const jwt = require('jsonwebtoken');
const {
  api,
  pool,
  resetData,
  authHeader,
  closeDb,
  expectError,
  AMARA,
  KASUN,
} = require('./helpers');
const { hashPassword } = require('../src/utils/password');

beforeAll(resetData);
afterAll(closeDb);

const secret = process.env.JWT_SECRET;

describe('Security checklist: password hashing with bcrypt (10 rounds)', () => {
  it('produces a bcrypt hash with cost 10', async () => {
    expect(await hashPassword('secret123')).toMatch(/^\$2b\$10\$.{53}$/);
  });
});

describe('Security checklist: JWT token validation', () => {
  const expired = () =>
    jwt.sign({ userId: 1, email: AMARA.email, exp: Math.floor(Date.now() / 1000) - 60 }, secret);

  it.each([
    ['no Authorization header', undefined],
    ['a non-Bearer scheme', 'Basic YW1hcmE6cGFzcw=='],
    ['"Bearer" without a token', 'Bearer'],
    ['extra parts after the token', 'Bearer abc def'],
    ['a token that is not a JWT', 'Bearer not-a-jwt'],
    ['a token signed with another secret', `Bearer ${jwt.sign({ userId: 1 }, 'x'.repeat(40))}`],
    [
      'an unsigned token (alg "none")',
      `Bearer ${jwt.sign({ userId: 1 }, null, { algorithm: 'none' })}`,
    ],
    ['an expired token', () => `Bearer ${expired()}`],
  ])('returns 401 UNAUTHORIZED for %s', async (_name, header) => {
    const value = typeof header === 'function' ? header() : header;
    const req = api().get('/api/users/me');
    if (value !== undefined) req.set('Authorization', value);
    expectError(await req, 401, 'UNAUTHORIZED');
  });

  it('says when a token has expired', async () => {
    const res = await api().get('/api/users/me').set('Authorization', `Bearer ${expired()}`);
    expect(res.body.error.message).toBe('Token has expired');
  });

  it('accepts the scheme name in any letter case, as HTTP allows', async () => {
    const [, token] = authHeader(AMARA).Authorization.split(' ');
    const res = await api().get('/api/users/me').set('Authorization', `bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns 401 for a valid token whose user has been deleted', async () => {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ('gone@blogflow.test', 'x', 'Gone')
       RETURNING id, email`,
    );
    const header = authHeader(rows[0]);
    await pool.query('DELETE FROM users WHERE id = $1', [rows[0].id]);

    expectError(await api().get('/api/users/me').set(header), 401, 'UNAUTHORIZED');
  });
});

describe('Security checklist: protected route middleware', () => {
  it.each([
    ['GET', '/api/users/me'],
    ['PUT', '/api/users/me'],
    ['POST', '/api/posts'],
    ['PUT', '/api/posts/1'],
    ['DELETE', '/api/posts/1'],
    ['POST', '/api/posts/1/comments'],
    ['PUT', '/api/comments/1'],
    ['DELETE', '/api/comments/1'],
  ])('%s %s requires a token', async (method, url) => {
    expectError(await api()[method.toLowerCase()](url).send({}), 401, 'UNAUTHORIZED');
  });
});

describe('Security checklist: owner-only operations', () => {
  // Post 1 belongs to Amara; comment 1 belongs to Kasun.
  it.each([
    ['PUT', '/api/posts/1', KASUN, { title: 'Taken over' }],
    ['DELETE', '/api/posts/1', KASUN, undefined],
    ['PUT', '/api/comments/1', AMARA, { content: 'Taken over' }],
    ['DELETE', '/api/comments/1', AMARA, undefined],
  ])('%s %s by a non-owner returns 403 FORBIDDEN', async (method, url, user, body) => {
    const res = await api()[method.toLowerCase()](url).set(authHeader(user)).send(body);
    expectError(res, 403, 'FORBIDDEN');
  });

  it('leaves the resources unchanged after the rejected attempts', async () => {
    const { rows } = await pool.query(
      `SELECT (SELECT title FROM posts WHERE id = 1) AS title,
              (SELECT content FROM comments WHERE id = 1) AS content`,
    );
    expect(rows[0].title).not.toBe('Taken over');
    expect(rows[0].content).not.toBe('Taken over');
  });
});

describe('Security checklist: input sanitisation', () => {
  it('strips HTML from post title and content but keeps plain text as typed', async () => {
    const res = await api().post('/api/posts').set(authHeader(AMARA)).send({
      title: 'Q&A <script>alert(1)</script>',
      content: 'if a < b && c > d <img src=x onerror=alert(1)>',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: 'Q&A', content: 'if a < b && c > d' });
  });

  it('rejects a title that is only HTML (empty after stripping)', async () => {
    const res = await api()
      .post('/api/posts')
      .set(authHeader(AMARA))
      .send({ title: '<script>alert(1)</script>', content: 'x' });
    expectError(res, 400, 'VALIDATION_ERROR');
  });

  it('strips HTML from comments', async () => {
    const res = await api()
      .post('/api/posts/2/comments')
      .set(authHeader(AMARA))
      .send({ content: 'Nice <b>post</b><script>steal()</script>' });
    expect(res.body.data.content).toBe('Nice post');
  });

  it('strips HTML from profile name and bio', async () => {
    const res = await api()
      .put('/api/users/me')
      .set(authHeader(AMARA))
      .send({ name: '<i>Amara</i>', bio: '<a href="javascript:x">Me</a>' });
    expect(res.body.data).toMatchObject({ name: 'Amara', bio: 'Me' });
  });

  it.each([['page=1&page=2'], ['author_id=1&author_id=2'], ['sort=asc&sort=desc']])(
    'returns 400 VALIDATION_ERROR for a repeated query parameter (%s)',
    async (query) => {
      expectError(await api().get(`/api/posts?${query}`), 400, 'VALIDATION_ERROR');
    },
  );
});

describe('HTTP hardening', () => {
  it('sets security headers and hides the framework', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers).toHaveProperty('strict-transport-security');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('allows cross-origin requests from browsers', async () => {
    const res = await api().get('/api/health').set('Origin', 'http://example.com');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('returns 413 PAYLOAD_TOO_LARGE for a body over 100kb', async () => {
    const res = await api()
      .post('/api/posts')
      .set(authHeader(AMARA))
      .send({ title: 'Big', content: 'x'.repeat(110 * 1024) });
    expectError(res, 413, 'PAYLOAD_TOO_LARGE');
  });
});
