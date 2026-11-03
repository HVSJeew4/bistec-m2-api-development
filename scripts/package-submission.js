// Builds the 5 Month 2 deliverables in submission/, named [participant]-month2-[deliverable].
//
// The project zip comes from `git archive HEAD`: it contains exactly the committed files,
// so node_modules, .env and other ignored files can never end up in it. That is also why the
// script refuses to run with uncommitted changes – the zip would not match the working tree.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PARTICIPANT = 'subhash-jeewantha';
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'submission');
const MIGRATIONS_DIR = path.join(ROOT, 'database', 'migrations');

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const out = (deliverable) => path.join(OUT_DIR, `${PARTICIPANT}-month2-${deliverable}`);

// All migrations in order, as one script that creates the schema in an empty database.
function buildSchemaSql(commit) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const header = [
    '-- BlogFlow API – PostgreSQL schema',
    `-- Generated from database/migrations/ at commit ${commit} by scripts/package-submission.js.`,
    '-- Run against an empty database: psql -d blogflow -f <this file>',
    '-- (In the project, `npm run db:migrate` applies the same files and tracks them.)',
    '',
  ];
  const parts = files.map(
    (file) =>
      `-- ==== ${file} ====\n\n${fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').trim()}\n`,
  );
  return `${header.join('\n')}\n${parts.join('\n')}`;
}

function main() {
  if (git('status', '--porcelain')) {
    throw new Error('Uncommitted changes: commit first, so the zip matches the repository.');
  }
  const commit = git('rev-parse', '--short', 'HEAD');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Project zip with a top-level blog-api/ folder (the rubric's project name).
  git('archive', '--format=zip', '--prefix=blog-api/', '-o', out('api-project.zip'), 'HEAD');
  fs.writeFileSync(out('schema.sql'), buildSchemaSql(commit));
  fs.copyFileSync(
    path.join(ROOT, 'postman', 'BlogFlow.postman_collection.json'),
    out('postman.json'),
  );
  fs.copyFileSync(path.join(ROOT, 'docs', 'swagger.yaml'), out('swagger.yaml'));
  fs.copyFileSync(path.join(ROOT, 'README.md'), out('readme.md'));

  console.log(`Built from commit ${commit}:`);
  for (const file of fs.readdirSync(OUT_DIR).sort()) {
    const { size } = fs.statSync(path.join(OUT_DIR, file));
    console.log(`  submission/${file}  (${Math.ceil(size / 1024)} KB)`);
  }
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
