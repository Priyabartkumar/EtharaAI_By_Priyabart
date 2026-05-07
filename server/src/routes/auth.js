const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.post('/transfer-admin', authenticate, authController.transferAdmin);
router.post('/host-admin', authenticate, authController.hostAdmin);
router.get('/users', authenticate, authController.getAllUsers);

module.exports = router;
