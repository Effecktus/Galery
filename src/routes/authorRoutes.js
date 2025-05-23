const express = require('express');
const router = express.Router();
const authorController = require('../controllers/authorController');
const auth = require('../middleware/auth');
const { validateAuthor, validateAuthorId, validate } = require('../middleware/validation');

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Публичные маршруты
router.get('/', authorController.getAllAuthors);
router.get('/:id', validateAuthorId, validate, authorController.getAuthor);

// Защищенные маршруты (только для админов и менеджеров)
router.use(auth.protect);
router.use(auth.restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateAuthor, validate, authorController.createAuthor);
router.put('/:id', validateAuthorId, validateAuthor, validate, authorController.updateAuthor);
router.delete('/:id', validateAuthorId, validate, authorController.deleteAuthor);

module.exports = router;