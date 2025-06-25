const express = require('express');
const router = express.Router();

// Импорт маршрутов
const authRoutes = require('./authRoutes');
const exhibitionRoutes = require('./exhibitionRoutes');
const ticketRoutes = require('./ticketRoutes');
const styleRoutes = require('./styleRoutes');
const genreRoutes = require('./genreRoutes');
const authorRoutes = require('./authorRoutes');
const artworkRoutes = require('./artworkRoutes');
const userRoutes = require('./userRoutes');

// Группировка маршрутов по версиям API
const apiV1 = express.Router();

// Публичные маршруты
apiV1.use('/auth', authRoutes);
apiV1.use('/exhibitions', exhibitionRoutes);
apiV1.use('/authors', authorRoutes);
apiV1.use('/styles', styleRoutes);
apiV1.use('/genres', genreRoutes);
apiV1.use('/artworks', artworkRoutes);

// Защищенные маршруты
apiV1.use('/tickets', ticketRoutes);
apiV1.use('/users', userRoutes);

// Подключаем все маршруты к основному роутеру
router.use('/api/v1', apiV1);

// Если нужен проброс для публичных страниц, добавить:
router.use('/exhibitions', require('./exhibitionRoutes'));

module.exports = router; 