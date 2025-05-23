const express = require('express');
const router = express.Router();
const artworkController = require('../controllers/artworkController');
const auth = require('../middleware/auth');
const { validateArtwork, validateArtworkId, validateArtworkUpdate, validate } = require('../middleware/validation');

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Публичные маршруты
router.get('/', artworkController.getAllArtworks);
router.get('/:id', validateArtworkId, validate, artworkController.getArtwork);

// Защищенные маршруты (только для админов и менеджеров)
router.use(auth.protect);
router.use(auth.restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateArtwork, validate, artworkController.createArtwork);
router.put('/:id', validateArtworkId, validateArtworkUpdate, validate, artworkController.updateArtwork);
router.delete('/:id', validateArtworkId, validate, artworkController.deleteArtwork);

module.exports = router;