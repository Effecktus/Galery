const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateUser, validateUserId, validate } = require('../middleware');

// Настройка rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: {
    status: 'error',
    message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже'
  }
});

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Применяем rate limiting ко всем маршрутам
router.use(limiter);

// Публичные маршруты
// Нет публичных маршрутов для пользователей

// Защищенные маршруты (только для админов)
router.use(protect);
router.use(restrictTo('admin'));
router.use(logRequest);

router.post('/', validateUser, validate, userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/:id', validateUserId, validate, userController.getUser);
router.put('/:id', validateUserId, validateUser, validate, userController.updateUser);
router.delete('/:id', validateUserId, validate, userController.deleteUser);

module.exports = router;
