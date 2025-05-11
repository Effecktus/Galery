const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const exhibitionController = require('../controllers/exhibitionController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateExhibition, validateExhibitionId, validateStatusUpdate, validate } = require('../middleware');

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
router.get('/', exhibitionController.getAllExhibitions);
router.get('/:id', validateExhibitionId, validate, exhibitionController.getExhibition);

// Защищенные маршруты (только для админов и менеджеров)
router.use(protect);
router.use(restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateExhibition, validate, exhibitionController.createExhibition);
router.put('/:id', validateExhibitionId, validateExhibition, validate, exhibitionController.updateExhibition);
router.patch('/:id/status', validateExhibitionId, validateStatusUpdate, validate, exhibitionController.updateExhibitionStatus);
router.delete('/:id', validateExhibitionId, validate, exhibitionController.deleteExhibition);

module.exports = router;