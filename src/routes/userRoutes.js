const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rules = require('../validators/userValidators');
const users = require('../controllers/userController');

const router = Router();

// /me is registered before /:id so "me" is never treated as an id.
router.get('/me', requireAuth, users.getMe);
router.put('/me', requireAuth, validate(rules.updateMe), users.updateMe);
router.get('/:id', validate(rules.getById), users.getById);
router.get('/:id/posts', validate(rules.listPosts), users.listPosts);

module.exports = router;
