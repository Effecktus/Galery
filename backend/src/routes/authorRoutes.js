const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authorController = require('../controllers/authorController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateAuthor, validateAuthorId, validate } = require('../middleware');

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
router.get('/', authorController.getAllAuthors);
router.get('/:id', validateAuthorId, validate, authorController.getAuthor);

// Защищенные маршруты (только для админов и менеджеров)
router.use(protect);
router.use(restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateAuthor, validate, authorController.createAuthor);
router.put('/:id', validateAuthorId, validateAuthor, validate, authorController.updateAuthor);
router.delete('/:id', validateAuthorId, validate, authorController.deleteAuthor);

module.exports = router;