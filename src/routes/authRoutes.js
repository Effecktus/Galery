const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { validateLogin, validateRegister, validatePasswordChange, validate } = require('../middleware/validation');

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

router.post('/register', validateRegister, validate, authController.register);
router.post('/login', validateLogin, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);

router.use(auth.protect);
router.use(logRequest);

router.delete('/logout', authController.logout);
router.patch('/change-password', validatePasswordChange, validate, authController.changePassword);
router.get('/me', authController.getMe);

module.exports = router;