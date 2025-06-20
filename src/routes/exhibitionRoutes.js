const express = require('express');
const router = express.Router();
const exhibitionController = require('../controllers/exhibitionController');
const auth = require('../middleware/auth');
const { validateExhibition, validateExhibitionId, validateExhibitionUpdate, validate } = require('../middleware/validation');

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

router.get('/', exhibitionController.getAllExhibitions);
router.get('/:id', validateExhibitionId, validate, exhibitionController.getExhibition);

router.use(auth.protect);
router.use(auth.restrictTo('admin', 'manager'));
router.use(logRequest);

router.post('/', validateExhibition, validate, exhibitionController.createExhibition);
router.patch('/:id', validateExhibitionId, validateExhibitionUpdate, validate, exhibitionController.updateExhibition);
router.delete('/:id', validateExhibitionId, validate, exhibitionController.deleteExhibition);

module.exports = router;