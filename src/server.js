const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`BlogFlow API listening on http://localhost:${port}/api`);
});
