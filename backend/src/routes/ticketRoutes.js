const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ticketController = require('../controllers/ticketController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateTicket, validateTicketId, validate } = require('../middleware');

// Настройка rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: {
    status: 'error',
    message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже'
  }
});

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Применяем rate limiting ко всем маршрутам
router.use(limiter);

// Защищенные маршруты (требуют аутентификации)
router.use(protect);
router.use(logRequest);

// Маршруты для всех аутентифицированных пользователей
router.post('/', validateTicket, validate, ticketController.createTicket);
router.get('/', ticketController.getUserTickets); // Для обычных пользователей покажет только их билеты
router.get('/:id', validateTicketId, validate, ticketController.getTicket);
router.delete('/:id', validateTicketId, validate, ticketController.cancelTicket);

module.exports = router; 