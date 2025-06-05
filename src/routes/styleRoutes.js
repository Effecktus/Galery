const express = require('express');
const router = express.Router();
const styleController = require('../controllers/styleController');
const auth = require('../middleware/auth');
const { validateStyle, validateStyleUpdate, validateStyleId, validate } = require('../middleware/validation');

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};


router.get('/', styleController.getAllStyles);
router.get('/:id', validateStyleId, validate, styleController.getStyle);

router.use(auth.protect);
router.use(auth.restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateStyle, validate, styleController.createStyle);
router.patch('/:id', validateStyleId, validateStyleUpdate, validate, styleController.updateStyle);
router.delete('/:id', validateStyleId, validate, styleController.deleteStyle);

module.exports = router;