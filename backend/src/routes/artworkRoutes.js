const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const artworkController = require('../controllers/artworkController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateArtwork, validateArtworkId, validateArtworkUpdate, validate } = require('../middleware');

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
router.get('/', artworkController.getAllArtworks);
router.get('/:id', validateArtworkId, validate, artworkController.getArtwork);

// Защищенные маршруты (только для админов и менеджеров)
router.use(protect);
router.use(restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateArtwork, validate, artworkController.createArtwork);
router.put('/:id', validateArtworkId, validateArtworkUpdate, validate, artworkController.updateArtwork);
router.delete('/:id', validateArtworkId, validate, artworkController.deleteArtwork);

module.exports = router;