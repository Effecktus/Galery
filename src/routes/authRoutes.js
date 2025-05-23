const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { validateLogin, validateRegister, validatePasswordChange, validate } = require('../middleware/validation');

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Применяем логирование ко всем маршрутам
router.use(logRequest);

// Публичные маршруты
router.post('/register', validateRegister, validate, authController.register);
router.post('/login', validateLogin, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Защищенные маршруты (требуют аутентификации)
router.use(auth.protect);

router.post('/logout', authController.logout);
router.post('/change-password', validatePasswordChange, validate, authController.changePassword);
router.get('/me', authController.getMe);

module.exports = router; 