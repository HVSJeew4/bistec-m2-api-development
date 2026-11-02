const bcrypt = require('bcrypt');
const { required } = require('../../src/config');

const SALT_ROUNDS = 10;
const BASE_DATE = Date.UTC(2026, 0, 5, 9, 0, 0); // fixed, so every run produces the same data
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const USERS = [
  {
    name: 'Amara Perera',
    email: 'amara@blogflow.test',
    bio: 'Backend developer writing about APIs.',
  },
  { name: 'Kasun Silva', email: 'kasun@blogflow.test', bio: 'PostgreSQL fan and data modeller.' },
  {
    name: 'Nethmi Fernando',
    email: 'nethmi@blogflow.test',
    bio: 'Frontend engineer, accessibility advocate.',
  },
  { name: 'Ravi Jayasinghe', email: 'ravi@blogflow.test', bio: null },
  { name: 'Dilini Wickrama', email: 'dilini@blogflow.test', bio: 'DevOps and cloud notes.' },
];

const POST_TITLES = [
  'Designing RESTful resources',
  'Why pagination matters',
  'JWT in plain words',
  'Draft: notes on rate limiting',
  'Indexes you actually need',
  'Validating input at the edge',
  'A consistent error format',
  'Draft: OpenAPI first or code first?',
  'Hashing passwords with bcrypt',
  'Foreign keys and cascades',
  'Testing APIs with supertest',
  'Draft: Postman collections that stay useful',
  'Express 5 async error handling',
  'Seeding a development database',
  'Owner-only operations',
  'Draft: CORS without the confusion',
  'Environment variables done right',
  'Reading query plans with EXPLAIN',
  'HTTP status codes cheat sheet',
  'Draft: Versioning a public API',
];

// 20 posts: author rotates through the 5 users (4 each); every 4th post is a draft (one per user).
function buildPosts() {
  return POST_TITLES.map((title, i) => ({
    title,
    content: `${title}. This is seed post number ${i + 1} for local development and tests.`,
    authorIndex: i % USERS.length,
    published: i % 4 !== 3,
    createdAt: new Date(BASE_DATE + i * DAY),
  }));
}

// 50 comments, spread over the 15 published posts only (nobody can see drafts to comment on them).
function buildComments(posts) {
  const published = posts.map((post, i) => ({ ...post, index: i })).filter((p) => p.published);
  return Array.from({ length: 50 }, (_, j) => {
    const post = published[j % published.length];
    return {
      content: `Comment ${j + 1}: thanks for "${post.title}".`,
      postIndex: post.index,
      authorIndex: (j * 2 + 1) % USERS.length,
      createdAt: new Date(post.createdAt.getTime() + (j + 1) * HOUR),
    };
  });
}

// Replaces all data with 5 users, 20 posts and 50 comments. Safe to run repeatedly.
async function seed(pool) {
  const password = required('SEED_USER_PASSWORD');
  const posts = buildPosts();
  const comments = buildComments(posts);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE comments, posts, users RESTART IDENTITY CASCADE');

    const userIds = [];
    for (const [i, user] of USERS.entries()) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const createdAt = new Date(BASE_DATE - (USERS.length - i) * DAY);
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, name, bio, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
        [user.email, passwordHash, user.name, user.bio, createdAt],
      );
      userIds.push(rows[0].id);
    }

    const postIds = [];
    for (const post of posts) {
      const { rows } = await client.query(
        `INSERT INTO posts (title, content, author_id, published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
        [post.title, post.content, userIds[post.authorIndex], post.published, post.createdAt],
      );
      postIds.push(rows[0].id);
    }

    for (const comment of comments) {
      await client.query(
        `INSERT INTO comments (content, post_id, author_id, created_at) VALUES ($1, $2, $3, $4)`,
        [
          comment.content,
          postIds[comment.postIndex],
          userIds[comment.authorIndex],
          comment.createdAt,
        ],
      );
    }

    await client.query('COMMIT');
    return { users: userIds.length, posts: postIds.length, comments: comments.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seed, USERS };

if (require.main === module) {
  const pool = require('../../src/db/pool');
  seed(pool)
    .then((counts) => console.log('Seeded:', counts))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
