const express = require('express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Builds the Express app without starting a server, so tests can call it with supertest.
const app = express();

app.use(express.json({ limit: '100kb' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
