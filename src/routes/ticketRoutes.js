const express = require('express');
const router = express.Router();
const { createTicket, getAllTickets, getMyTickets, getTicket, cancelTicket } = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const { validateTicket, validateTicketId, validate } = require('../middleware/validation');

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Защищенные маршруты (требуют аутентификации)
router.use(auth.protect);
router.use(logRequest);

// Маршруты для всех аутентифицированных пользователей
router.post('/', validateTicket, validate, createTicket);
router.get('/my-tickets', getMyTickets);
router.get('/my-tickets/:id', validateTicketId, validate, getTicket);
router.post('/:id/cancel', validateTicketId, validate, cancelTicket);

// Маршруты только для админов
router.use(auth.restrictTo('admin'));
router.get('/', getAllTickets);
router.get('/:id', validateTicketId, validate, getTicket);

module.exports = router; 