const app = require('./app');
const { port, jwtSecret } = require('./config');

// Fail at startup, not on the first login, if the JWT secret is missing or too short.
jwtSecret();

app.listen(port, () => {
  console.log(`BlogFlow API listening on http://localhost:${port}/api`);
});
