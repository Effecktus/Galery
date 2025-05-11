const { body, param } = require('express-validator');
const Exhibition = require('../models/Exhibition');
const { Op } = require('sequelize');

// Валидация для создания и обновления выставки
exports.validateExhibition = [
  body('title')
    .trim()
    .notEmpty().withMessage('Название выставки обязательно')
    .isLength({ min: 3, max: 255 }).withMessage('Название должно быть от 3 до 255 символов'),
  
  body('location')
    .trim()
    .notEmpty().withMessage('Место проведения обязательно')
    .isLength({ min: 3, max: 255 }).withMessage('Место проведения должно быть от 3 до 255 символов'),
  
  body('start_date')
    .notEmpty().withMessage('Дата начала обязательна')
    .isISO8601().withMessage('Неверный формат даты начала')
    .custom((value, { req }) => {
      const startDate = new Date(value);
      if (startDate < new Date()) {
        throw new Error('Дата начала не может быть в прошлом');
      }
      return true;
    }),
  
  body('end_date')
    .notEmpty().withMessage('Дата окончания обязательна')
    .isISO8601().withMessage('Неверный формат даты окончания')
    .custom(async(value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.start_date);
      
      if (endDate <= startDate) {
        throw new Error('Дата окончания должна быть позже даты начала');
      }
    }),
  body('ticket_price')
    .notEmpty().withMessage('Цена билета обязательна')
    .isFloat({ min: 0, max: 1000000 }).withMessage('Цена билета должна быть от 0 до 1 000 000')
    .custom((value) => {
      if (value.toString().split('.')[1]?.length > 2) {
        throw new Error('Цена билета не может иметь более 2 знаков после запятой');
      }
      return true;
    }),
  
  body('total_tickets')
    .notEmpty().withMessage('Общее количество билетов обязательно')
    .isInt({ min: 1}).withMessage('Количество билетов должно быть больше 0'),
  
  body('remaining_tickets')
    .optional()
    .isInt({ min: 0 }).withMessage('Оставшееся количество билетов не может быть отрицательным')
    .custom((value, { req }) => {
      if (value > req.body.total_tickets) {
        throw new Error('Оставшееся количество билетов не может быть больше общего количества');
      }
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed']).withMessage('Неверный статус выставки')
    .custom((value, { req }) => {
      if (value === 'completed' && new Date(req.body.end_date) > new Date()) {
        throw new Error('Нельзя установить статус "completed" для будущей выставки');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов')
    .trim()
];

// Валидация ID выставки
exports.validateExhibitionId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Неверный ID выставки')
];

// Валидация обновления статуса
exports.validateStatusUpdate = [
  body('status')
    .notEmpty().withMessage('Статус обязателен')
    .isIn(['planned', 'active', 'completed']).withMessage('Неверный статус выставки')
]; 