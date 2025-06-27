const express = require('express');
const router = express.Router();
const artworkController = require('../controllers/artworkController');
const auth = require('../middleware/auth');
const {validateArtwork, validateArtworkId, validateArtworkUpdate, validate} = require('../middleware/validation');
const upload = require('../middleware/upload');

const logRequest = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
    next();
};

router.get('/', artworkController.getAllArtworks);
router.get('/:id', validateArtworkId, validate, artworkController.getArtwork);
router.get('/:id/exhibitions', artworkController.getArtworkExhibitions);

router.use(auth.protect);
router.use(auth.restrictTo('admin'));
router.use(logRequest);

router.post('/', upload.single('image_path'), validateArtwork, validate, artworkController.createArtwork);
router.patch('/:id', upload.single('image_path'), validateArtworkId, validateArtworkUpdate, validate, artworkController.updateArtwork);
router.delete('/:id', validateArtworkId, validate, artworkController.deleteArtwork);

module.exports = router;