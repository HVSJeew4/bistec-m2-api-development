const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rules = require('../validators/commentValidators');
const comments = require('../controllers/commentController');

const router = Router();

// A comment is addressed by its own id once it exists.
router.put('/:id', requireAuth, validate(rules.update), comments.update);
router.delete('/:id', requireAuth, validate(rules.remove), comments.remove);

module.exports = router;
