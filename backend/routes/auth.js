const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/password', auth, authController.changePassword);
router.delete('/account', auth, authController.deleteAccount);

module.exports = router;
