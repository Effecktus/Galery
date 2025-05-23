const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');
const auth = require('../middleware/auth');
const { validateGenre, validateGenreId, validate } = require('../middleware/validation');

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Публичные маршруты
router.get('/', genreController.getAllGenres);
router.get('/:id', validateGenreId, validate, genreController.getGenre);

// Защищенные маршруты (только для админов и менеджеров)
router.use(auth.protect);
router.use(auth.restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateGenre, validate, genreController.createGenre);
router.put('/:id', validateGenreId, validateGenre, validate, genreController.updateGenre);
router.delete('/:id', validateGenreId, validate, genreController.deleteGenre);

module.exports = router;