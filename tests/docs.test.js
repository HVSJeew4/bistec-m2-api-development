const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { api, closeDb } = require('./helpers');
const { version } = require('../package.json');

afterAll(closeDb);

const SPEC_PATH = path.join(__dirname, '..', 'docs', 'swagger.yaml');
const spec = YAML.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// Must match the router.use() prefixes in src/routes/index.js.
const MOUNTS = {
  '': require('../src/routes'),
  '/auth': require('../src/routes/authRoutes'),
  '/users': require('../src/routes/userRoutes'),
  '/posts': require('../src/routes/postRoutes'),
  '/comments': require('../src/routes/commentRoutes'),
};

// Every route the app defines, with the names of its middleware (requireAuth, validate, …).
const appRoutes = Object.entries(MOUNTS).flatMap(([prefix, router]) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => ({
        method,
        // Express "/:id" → OpenAPI "/{id}"; the router's "/" means the prefix itself.
        path: `/api${prefix}${layer.route.path === '/' ? '' : layer.route.path}`.replace(
          /:(\w+)/g,
          '{$1}',
        ),
        middleware: layer.route.stack.map((l) => l.name),
      })),
    ),
);
const label = (r) => `${r.method.toUpperCase()} ${r.path || '/api'}`;
const operation = (r) => spec.paths?.[r.path || '/api']?.[r.method];

describe('OpenAPI spec (docs/swagger.yaml)', () => {
  it('is a valid OpenAPI 3.0.0 document for BlogFlow API', async () => {
    // validate() mutates its argument (resolves $refs), so give it a copy.
    await expect(SwaggerParser.validate(structuredClone(spec))).resolves.toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info).toMatchObject({ title: 'BlogFlow API', version });
  });

  it('finds the 17 routes of the app', () => {
    expect(appRoutes).toHaveLength(17);
  });

  it.each(appRoutes.map((r) => [label(r), r]))('documents %s', (_label, route) => {
    const op = operation(route);
    expect(op).toBeDefined();
    expect(op.summary).toEqual(expect.any(String));
    expect(op.tags).toHaveLength(1);
    expect(Object.keys(op.responses).some((code) => code.startsWith('2'))).toBe(true);
    expect(op.responses).toHaveProperty('429');
    expect(op.responses).toHaveProperty('500');

    if (route.middleware.includes('requireAuth')) {
      expect(op.security).toEqual([{ bearerAuth: [] }]);
      expect(op.responses).toHaveProperty('401');
    }
    if (route.middleware.includes('validate')) {
      expect(op.responses).toHaveProperty('400');
    }
  });

  it('documents no operation that the app does not have', () => {
    const documented = Object.entries(spec.paths ?? {}).flatMap(([p, item]) =>
      Object.keys(item)
        .filter((m) => HTTP_METHODS.includes(m))
        .map((method) => `${method.toUpperCase()} ${p}`),
    );
    expect(documented.sort()).toEqual(appRoutes.map(label).sort());
  });
});

describe('GET /api-docs', () => {
  it('serves the Swagger UI', async () => {
    const res = await api().get('/api-docs/').redirects(1);
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('serves the raw spec for tools such as Postman', async () => {
    const res = await api().get('/api-docs/swagger.yaml');
    expect(res.status).toBe(200);
    expect(YAML.parse(res.text)).toEqual(spec);
  });
});
