const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');
const auth = require('../middleware/auth');
const { validateGenre, validateGenreUpdate, validateGenreId, validate } = require('../middleware/validation');

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

router.use(logRequest);

router.get('/', genreController.getAllGenres);
router.get('/:id', validateGenreId, validate, genreController.getGenre);

// router.use(auth.protect);
// router.use(auth.restrictTo('admin', 'manager'));

router.post('/', validateGenre, validate, genreController.createGenre);
router.patch('/:id', validateGenreId, validateGenreUpdate, validate, genreController.updateGenre);
router.delete('/:id', validateGenreId, validate, genreController.deleteGenre);

module.exports = router;