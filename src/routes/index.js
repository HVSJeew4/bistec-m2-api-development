const { Router } = require('express');
const health = require('../controllers/healthController');

const router = Router();

router.get('/health', health.check);
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/posts', require('./postRoutes'));
router.use('/comments', require('./commentRoutes'));

module.exports = router;
