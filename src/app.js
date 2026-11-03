const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimiter = require('./middleware/rateLimiter');
const rejectRepeatedQuery = require('./middleware/rejectRepeatedQuery');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Builds the Express app without starting a server, so tests can call it with supertest.
const app = express();

// Order matters: security headers and CORS first (so even a 429 carries them),
// then the rate limit, before any body parsing or database work.
app.use(helmet());
// Any origin may call the API. Auth uses a Bearer header, not cookies, so a foreign site
// cannot make requests on a user's behalf without already holding their token.
app.use(cors());
app.use(rateLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(rejectRepeatedQuery);

app.use('/api', routes);
app.use('/api-docs', require('./routes/docsRoutes'));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
