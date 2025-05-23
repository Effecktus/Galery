const express = require('express');
const router = express.Router();
const exhibitionController = require('../controllers/exhibitionController');
const auth = require('../middleware/auth');
const { validateExhibition, validateExhibitionId, validateStatusUpdate, validate } = require('../middleware/validation');

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Публичные маршруты
router.get('/', exhibitionController.getAllExhibitions);
router.get('/:id', validateExhibitionId, validate, exhibitionController.getExhibition);

// Защищенные маршруты (только для админов и менеджеров)
router.use(auth.protect);
router.use(auth.restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateExhibition, validate, exhibitionController.createExhibition);
router.put('/:id', validateExhibitionId, validateExhibition, validate, exhibitionController.updateExhibition);
router.patch('/:id/status', validateExhibitionId, validateStatusUpdate, validate, exhibitionController.updateExhibitionStatus);
router.delete('/:id', validateExhibitionId, validate, exhibitionController.deleteExhibition);

module.exports = router;