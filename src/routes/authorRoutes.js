const express = require('express');
const router = express.Router();
const authorController = require('../controllers/authorController');
const auth = require('../middleware/auth');
const { validateAuthor, validateAuthorUpdate, validateAuthorId, validate } = require('../middleware/validation');

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

router.get('/', authorController.getAllAuthors);
router.get('/:id', validateAuthorId, validate, authorController.getAuthor);

router.use(auth.protect);
router.use(auth.restrictTo('admin'));
router.use(logRequest);

router.post('/', validateAuthor, validate, authorController.createAuthor);
router.patch('/:id', validateAuthorId, validateAuthorUpdate, validate, authorController.updateAuthor);
router.delete('/:id', validateAuthorId, validate, authorController.deleteAuthor);

module.exports = router;