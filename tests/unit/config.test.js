const { jwtSecret } = require('../../src/config');

describe('jwtSecret', () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    process.env.JWT_SECRET = original;
  });

  it('returns the secret when it is at least 32 characters', () => {
    process.env.JWT_SECRET = 'x'.repeat(32);
    expect(jwtSecret()).toBe('x'.repeat(32));
  });

  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => jwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is shorter than 32 characters', () => {
    process.env.JWT_SECRET = 'too-short';
    expect(() => jwtSecret()).toThrow(/at least 32 characters/);
  });
});
