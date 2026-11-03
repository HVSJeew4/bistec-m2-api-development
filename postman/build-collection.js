// Generates BlogFlow.postman_collection.json (Postman collection format v2.1).
// Run with `npm run postman:build` after changing this file; commit both files.
//
// Writing the collection as code keeps the test scripts readable – in the JSON they are
// arrays of escaped strings. The requests run top to bottom as one scenario: register a fresh
// user, log in, then exercise every endpoint and clean up what was created.

const fs = require('node:fs');
const path = require('node:path');

const OUTPUT = path.join(__dirname, 'BlogFlow.postman_collection.json');

// ---------- script snippets (these run inside Postman, not in Node) ----------

// Saves a value where {{name}} will read it: in the active environment if it defines the
// variable (environment values override collection values), otherwise in the collection.
const SET_VAR =
  'const setVar = (k, v) => (pm.environment.has(k) ? pm.environment : pm.collectionVariables).set(k, v);';

const expectStatus = (code) =>
  `pm.test('status is ${code}', () => pm.response.to.have.status(${code}));`;

const expectErrorCode = (code) =>
  `pm.test('error code is ${code}', () => pm.expect(pm.response.json().error.code).to.eql('${code}'));`;

const expectPagination = () =>
  `pm.test('has pagination', () => {
  const { pagination } = pm.response.json();
  pm.expect(pagination).to.have.all.keys('page', 'limit', 'total', 'totalPages');
  pm.expect(pagination.totalPages).to.eql(Math.ceil(pagination.total / pagination.limit));
});`;

// Collection-level pre-request script: keeps {{token}} valid. If a token is missing or about to
// expire and the run has credentials (set by "Register"), it logs in first.
const COLLECTION_PRE_REQUEST = `${SET_VAR}
const token = pm.variables.get('token');
const email = pm.variables.get('userEmail');
const password = pm.variables.get('userPassword');
const cryptoJs = require('crypto-js'); // bundled with Postman (the global CryptoJS is deprecated)

// Reads "exp" from the JWT payload (base64url) without verifying it – that is the server's job.
function expiresSoon(jwt) {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(cryptoJs.enc.Base64.parse(part).toString(cryptoJs.enc.Utf8));
    return payload.exp * 1000 < Date.now() + 60 * 1000;
  } catch (e) {
    return true;
  }
}

if (email && password && (!token || expiresSoon(token))) {
  pm.sendRequest(
    {
      url: pm.variables.replaceIn('{{baseUrl}}/auth/login'),
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      body: { mode: 'raw', raw: JSON.stringify({ email, password }) },
    },
    (err, res) => {
      if (!err && res.code === 200) setVar('token', res.json().data.token);
    },
  );
}`;

// Collection-level test script: runs after every request.
// (No response-time assertion: it made runs fail on a busy machine without any API change.)
const COLLECTION_TESTS = `pm.test('response uses the JSON envelope', () => {
  pm.response.to.be.json;
  const body = pm.response.json();
  pm.expect(body.success).to.be.a('boolean');
  if (body.success) pm.expect(body).to.have.property('data');
  else pm.expect(body.error).to.include.keys('code', 'message');
});`;

// ---------- request builder ----------

function request(name, method, url, { body, auth = true, pre, tests = [] } = {}) {
  const event = [];
  if (pre)
    event.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: pre.split('\n') },
    });
  event.push({
    listen: 'test',
    script: { type: 'text/javascript', exec: tests.join('\n').split('\n') },
  });

  const req = { method, header: [], url: `{{baseUrl}}${url}` };
  if (body !== undefined) {
    req.header.push({ key: 'Content-Type', value: 'application/json' });
    req.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  // Requests inherit the collection's Bearer {{token}} auth unless marked as public.
  if (!auth) req.auth = { type: 'noauth' };
  return { name, event, request: req };
}

const folder = (name, description, item) => ({ name, description, item });

// ---------- the scenario ----------

const items = [
  folder('Meta', 'API index and health check.', [
    request('API index', 'GET', '', {
      auth: false,
      tests: [
        expectStatus(200),
        `pm.test('links to the main resources', () => pm.expect(pm.response.json().data.links).to.include.keys('posts', 'docs'));`,
      ],
    }),
    request('Health check', 'GET', '/health', {
      auth: false,
      tests: [
        expectStatus(200),
        `pm.test('database is up', () => pm.expect(pm.response.json().data).to.eql({ status: 'ok', database: 'up' }));`,
        `pm.test('sends rate-limit headers', () => pm.response.to.have.header('RateLimit-Policy', '100;w=60'));`,
      ],
    }),
  ]),

  folder('Auth', 'Registers a fresh user for this run and logs in. Run this folder first.', [
    request('Register', 'POST', '/auth/register', {
      auth: false,
      // A new email per run, and a random password that only lives in this run's variables.
      pre: `${SET_VAR}
setVar('userEmail', 'postman-' + Date.now() + '@blogflow.test');
setVar('userPassword', pm.variables.replaceIn('{{$randomPassword}}') + 'Aa1!');
setVar('token', '');`,
      body: { email: '{{userEmail}}', password: '{{userPassword}}', name: 'Postman Tester' },
      tests: [
        SET_VAR,
        expectStatus(201),
        `const user = pm.response.json().data;
pm.test('returns the new user without the password', () => {
  pm.expect(user.email).to.eql(pm.variables.get('userEmail'));
  pm.expect(user).to.not.have.property('password');
  pm.expect(user).to.not.have.property('passwordHash');
});
setVar('userId', user.id);`,
      ],
    }),
    request('Register – duplicate email (409)', 'POST', '/auth/register', {
      auth: false,
      body: { email: '{{userEmail}}', password: 'another-password', name: 'Copy' },
      tests: [expectStatus(409), expectErrorCode('CONFLICT')],
    }),
    request('Register – invalid input (400)', 'POST', '/auth/register', {
      auth: false,
      body: { email: 'not-an-email', password: 'short' },
      tests: [
        expectStatus(400),
        expectErrorCode('VALIDATION_ERROR'),
        `pm.test('lists every invalid field', () => {
  const fields = pm.response.json().error.details.map((d) => d.field);
  pm.expect(fields).to.include.members(['email', 'password', 'name']);
});`,
      ],
    }),
    request('Login – wrong password (401)', 'POST', '/auth/login', {
      auth: false,
      body: { email: '{{userEmail}}', password: 'wrong-password' },
      tests: [expectStatus(401), expectErrorCode('UNAUTHORIZED')],
    }),
    request('Login', 'POST', '/auth/login', {
      auth: false,
      body: { email: '{{userEmail}}', password: '{{userPassword}}' },
      tests: [
        SET_VAR,
        expectStatus(200),
        `const { token, user } = pm.response.json().data;
pm.test('returns a JWT and the user', () => {
  pm.expect(token.split('.')).to.have.lengthOf(3);
  pm.expect(user.id).to.eql(Number(pm.variables.get('userId')));
});
setVar('token', token);`,
      ],
    }),
  ]),

  folder('Users', 'Own profile (token required) and public author profiles.', [
    request('Get current user', 'GET', '/users/me', {
      tests: [
        expectStatus(200),
        `pm.test('is the logged-in user', () => pm.expect(pm.response.json().data.email).to.eql(pm.variables.get('userEmail')));`,
      ],
    }),
    request('Get current user – no token (401)', 'GET', '/users/me', {
      auth: false,
      tests: [expectStatus(401), expectErrorCode('UNAUTHORIZED')],
    }),
    request('Update current user', 'PUT', '/users/me', {
      body: { bio: 'Written by <b>Postman</b><script>alert(1)</script>' },
      tests: [
        expectStatus(200),
        `pm.test('HTML is stripped from the bio', () => pm.expect(pm.response.json().data.bio).to.eql('Written by Postman'));`,
      ],
    }),
    request('Get public profile', 'GET', '/users/{{userId}}', {
      auth: false,
      tests: [
        expectStatus(200),
        `pm.test('does not expose the email', () => pm.expect(pm.response.json().data).to.not.have.property('email'));`,
      ],
    }),
    request("Get an author's posts", 'GET', '/users/1/posts?limit=2', {
      auth: false,
      tests: [
        expectStatus(200),
        expectPagination(),
        `pm.test('only that author, only published', () => {
  pm.response.json().data.forEach((p) => {
    pm.expect(p.author.id).to.eql(1);
    pm.expect(p.published).to.be.true;
  });
});`,
      ],
    }),
  ]),

  folder('Posts', 'Listing with pagination/filters, CRUD and owner checks.', [
    request('List posts', 'GET', '/posts?page=1&limit=5', {
      auth: false,
      tests: [
        SET_VAR,
        expectStatus(200),
        expectPagination(),
        `const posts = pm.response.json().data;
pm.test('at most 5 published posts, each with its author', () => {
  pm.expect(posts.length).to.be.at.most(5);
  posts.forEach((p) => {
    pm.expect(p.published).to.be.true;
    pm.expect(p.author).to.have.all.keys('id', 'name');
  });
});
// Someone else's post, for the 403 test below.
const other = posts.find((p) => p.author.id !== Number(pm.variables.get('userId')));
if (other) setVar('otherPostId', other.id);`,
      ],
    }),
    request('List posts – search and sort', 'GET', '/posts?search=jwt&sort=asc', {
      auth: false,
      tests: [
        expectStatus(200),
        `pm.test('every title matches the search', () => {
  pm.response.json().data.forEach((p) => pm.expect(p.title.toLowerCase()).to.include('jwt'));
});`,
      ],
    }),
    request('List posts – invalid limit (400)', 'GET', '/posts?limit=500', {
      auth: false,
      tests: [expectStatus(400), expectErrorCode('VALIDATION_ERROR')],
    }),
    request('Create post – missing fields (400)', 'POST', '/posts', {
      body: {},
      tests: [expectStatus(400), expectErrorCode('VALIDATION_ERROR')],
    }),
    request('Create post', 'POST', '/posts', {
      body: {
        title: 'Hello from Postman',
        content: 'Created by the Postman collection.',
        published: true,
      },
      tests: [
        SET_VAR,
        expectStatus(201),
        `const post = pm.response.json().data;
pm.test('belongs to the logged-in user', () => pm.expect(post.author.id).to.eql(Number(pm.variables.get('userId'))));
setVar('postId', post.id);`,
      ],
    }),
    request('Get post', 'GET', '/posts/{{postId}}', {
      auth: false,
      tests: [
        expectStatus(200),
        `pm.test('is the created post', () => pm.expect(pm.response.json().data.title).to.eql('Hello from Postman'));`,
      ],
    }),
    request('Update post', 'PUT', '/posts/{{postId}}', {
      body: { title: 'Updated by Postman' },
      tests: [
        expectStatus(200),
        `pm.test('title changed, content kept', () => {
  const post = pm.response.json().data;
  pm.expect(post.title).to.eql('Updated by Postman');
  pm.expect(post.content).to.eql('Created by the Postman collection.');
});`,
      ],
    }),
    request("Update someone else's post (403)", 'PUT', '/posts/{{otherPostId}}', {
      body: { title: 'Not mine' },
      tests: [expectStatus(403), expectErrorCode('FORBIDDEN')],
    }),
    request('Get post – not found (404)', 'GET', '/posts/999999', {
      auth: false,
      tests: [expectStatus(404), expectErrorCode('NOT_FOUND')],
    }),
  ]),

  folder('Comments', 'Comments on the post created above.', [
    request('Create comment', 'POST', '/posts/{{postId}}/comments', {
      body: { content: 'First comment from Postman' },
      tests: [
        SET_VAR,
        expectStatus(201),
        `const comment = pm.response.json().data;
pm.test('is linked to the post', () => pm.expect(comment.postId).to.eql(Number(pm.variables.get('postId'))));
setVar('commentId', comment.id);`,
      ],
    }),
    request('List comments of post', 'GET', '/posts/{{postId}}/comments', {
      auth: false,
      tests: [
        expectStatus(200),
        expectPagination(),
        `pm.test('contains the new comment', () => {
  const ids = pm.response.json().data.map((c) => c.id);
  pm.expect(ids).to.include(Number(pm.variables.get('commentId')));
});`,
      ],
    }),
    request('Update comment', 'PUT', '/comments/{{commentId}}', {
      body: { content: 'Edited comment' },
      tests: [
        expectStatus(200),
        `pm.test('content changed', () => pm.expect(pm.response.json().data.content).to.eql('Edited comment'));`,
      ],
    }),
    request('Delete comment', 'DELETE', '/comments/{{commentId}}', {
      tests: [
        expectStatus(200),
        `pm.test('returns the deleted id', () => pm.expect(pm.response.json().data.id).to.eql(Number(pm.variables.get('commentId'))));`,
      ],
    }),
    request('Delete comment again (404)', 'DELETE', '/comments/{{commentId}}', {
      tests: [expectStatus(404), expectErrorCode('NOT_FOUND')],
    }),
  ]),

  folder('Cleanup', 'Deletes the post created by this run.', [
    request('Delete post', 'DELETE', '/posts/{{postId}}', {
      tests: [expectStatus(200)],
    }),
    request('Get deleted post (404)', 'GET', '/posts/{{postId}}', {
      auth: false,
      tests: [expectStatus(404), expectErrorCode('NOT_FOUND')],
    }),
  ]),
];

const collection = {
  info: {
    name: 'BlogFlow API',
    description:
      'All BlogFlow API endpoints, grouped by resource, with test scripts.\n\n' +
      'Start the API (`npm run dev`), then run the whole collection in order (Collection Runner or ' +
      '`npm run test:postman`). "Register" creates a fresh user for each run; the collection ' +
      'pre-request script logs in automatically whenever {{token}} is missing or about to expire.\n\n' +
      'Change {{baseUrl}} if the API is not on http://localhost:3000.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
  event: [
    {
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: COLLECTION_PRE_REQUEST.split('\n') },
    },
    { listen: 'test', script: { type: 'text/javascript', exec: COLLECTION_TESTS.split('\n') } },
  ],
  // Defaults so this one file works without an environment. Values set during a run are not saved.
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000/api' },
    { key: 'token', value: '' },
    { key: 'userEmail', value: '' },
    { key: 'userPassword', value: '' },
    { key: 'userId', value: '' },
    { key: 'postId', value: '' },
    { key: 'commentId', value: '' },
    { key: 'otherPostId', value: '1' },
  ],
  item: items,
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(collection, null, 2)}\n`);
console.log(
  `Wrote ${path.relative(process.cwd(), OUTPUT)} (${items.flatMap((f) => f.item).length} requests)`,
);
