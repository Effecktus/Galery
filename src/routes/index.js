const express = require('express');
const router = express.Router();

// Импорт API-маршрутов
const authRoutes         = require('./authRoutes');
const exhibitionApi      = require('./exhibitionRoutes');
const ticketRoutes       = require('./ticketRoutes');
const styleRoutes        = require('./styleRoutes');
const genreRoutes        = require('./genreRoutes');
const authorRoutes       = require('./authorRoutes');
const artworkApiRoutes   = require('./artworkRoutes');
const userRoutes         = require('./userRoutes');

// Группировка маршрутов по версиям API
const apiV1 = express.Router();

// Публичные API-маршруты
apiV1.use('/auth',       authRoutes);
apiV1.use('/exhibitions',exhibitionApi);
apiV1.use('/authors',    authorRoutes);
apiV1.use('/styles',     styleRoutes);
apiV1.use('/genres',     genreRoutes);
apiV1.use('/artworks',   artworkApiRoutes);

// Защищённые API-маршруты
apiV1.use('/tickets',    ticketRoutes);
apiV1.use('/users',      userRoutes);

// Монтируем API v1
router.use('/api/v1', apiV1);

// Страница списка выставок (HTML)
const exhibitionController = require('../controllers/exhibitionController');
router.get('/exhibitions', exhibitionController.renderExhibitionsPage);

// Страница списка картин (HTML)
const artworkController = require('../controllers/artworkController');
router.get('/artworks', artworkController.renderArtworksPage);

const ticketController = require('../controllers/ticketController');
router.get('/tickets', ticketController.renderUserTickets);
module.exports = router;
