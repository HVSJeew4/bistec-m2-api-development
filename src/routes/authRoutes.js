const { Router } = require('express');
const validate = require('../middleware/validate');
const rules = require('../validators/authValidators');
const auth = require('../controllers/authController');

const router = Router();

router.post('/register', validate(rules.register), auth.register);
router.post('/login', validate(rules.login), auth.login);

module.exports = router;
