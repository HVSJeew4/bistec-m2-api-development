const { Router } = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const postRules = require('../validators/postValidators');
const commentRules = require('../validators/commentValidators');
const posts = require('../controllers/postController');
const comments = require('../controllers/commentController');

const router = Router();

// Public reads use optionalAuth: anonymous callers see published posts, authors also their drafts.
router.get('/', optionalAuth, validate(postRules.list), posts.list);
router.get('/:id', optionalAuth, validate(postRules.getById), posts.getById);
router.post('/', requireAuth, validate(postRules.create), posts.create);
router.put('/:id', requireAuth, validate(postRules.update), posts.update);
router.delete('/:id', requireAuth, validate(postRules.remove), posts.remove);

// Comments are nested under their post for listing and creating.
router.get('/:id/comments', optionalAuth, validate(commentRules.listForPost), comments.listForPost);
router.post('/:id/comments', requireAuth, validate(commentRules.create), comments.create);

module.exports = router;
