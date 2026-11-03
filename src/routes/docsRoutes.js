const fs = require('node:fs');
const path = require('node:path');
const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

// docs/swagger.yaml is the single source: it is the submitted spec, it is rendered here,
// and tests/docs.test.js checks it against the real routes.
const SPEC_FILE = path.join(__dirname, '..', '..', 'docs', 'swagger.yaml');
const specText = fs.readFileSync(SPEC_FILE, 'utf8');

const router = Router();

// Raw spec, e.g. for "Import from link" in Postman. Registered before the UI's catch-all.
router.get('/swagger.yaml', (_req, res) => {
  res.type('application/yaml').send(specText);
});

router.use('/', swaggerUi.serve, swaggerUi.setup(YAML.parse(specText)));

module.exports = router;
