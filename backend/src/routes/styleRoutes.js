const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const styleController = require('../controllers/styleController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateStyle, validateStyleId, validate } = require('../middleware');

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
router.get('/', styleController.getAllStyles);
router.get('/:id', validateStyleId, validate, styleController.getStyle);

// Защищенные маршруты (только для админов и менеджеров)
router.use(protect);
router.use(restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateStyle, validate, styleController.createStyle);
router.put('/:id', validateStyleId, validateStyle, validate, styleController.updateStyle);
router.delete('/:id', validateStyleId, validate, styleController.deleteStyle);

module.exports = router;