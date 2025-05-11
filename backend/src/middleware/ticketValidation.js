const { body, param } = require('express-validator');
const Exhibition = require('../models/Exhibition');
const Ticket = require('../models/Ticket');

// Валидация для создания билета
exports.validateTicket = [
  body('exhibition_id')
    .notEmpty().withMessage('ID выставки обязателен')
    .isInt({ min: 1 }).withMessage('Неверный ID выставки')
    .custom(async (value, { req }) => {
      const exhibition = await Exhibition.findByPk(value);
      if (!exhibition) {
        throw new Error('Выставка не найдена');
      }
      if (exhibition.status !== 'active') {
        throw new Error('Нельзя купить билет на неактивную выставку');
      }
      if (new Date(exhibition.start_date) < new Date()) {
        throw new Error('Нельзя купить билет на прошедшую выставку');
      }
      return true;
    }),

  body('quantity')
    .notEmpty().withMessage('Количество билетов обязательно')
    .isInt().withMessage('Количество билетов должно быть целым числом')
    .custom(async (value, { req }) => {
      const exhibition = await Exhibition.findByPk(req.body.exhibition_id);
      if (value > exhibition.remaining_tickets) {
        throw new Error('Количество билетов превышает доступное количество');
      }
    }),
];

// Валидация ID билета
exports.validateTicketId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Неверный ID билета')
    .custom(async (value, { req }) => {
      const ticket = await Ticket.findByPk(value);
      if (!ticket) {
        throw new Error('Билет не найден');
      }
      if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
        throw new Error('Нет доступа к этому билету');
      }
      return true;
    })
]; 