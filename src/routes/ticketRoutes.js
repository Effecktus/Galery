const express = require('express');
const router = express.Router();
const { createTicket, getAllTickets, getMyTickets, getTicket, cancelTicket } = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const { validateTicket, validateTicketId, validate } = require('../middleware/validation');

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

router.use(auth.protect);
router.use(logRequest);

router.post('/', validateTicket, validate, createTicket);
router.get('/my-tickets', getMyTickets);
router.get('/:id', validateTicketId, validate, getTicket);
router.delete('/:id', validateTicketId, validate, cancelTicket);

router.use(auth.restrictTo('admin'));
router.get('/', getAllTickets);

module.exports = router;