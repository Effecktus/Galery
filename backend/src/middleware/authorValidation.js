const { body, param } = require('express-validator');
const Author = require('../models/Author');
const { Op } = require('sequelize');

// Валидация для создания и обновления автора
exports.validateAuthor = [
  body('surname')
    .trim()
    .notEmpty().withMessage('Фамилия обязательна')
    .isLength({ min: 3, max: 50 }).withMessage('Фамилия должна быть от 3 до 50 символов'),
  body('first_name')
    .trim()
    .notEmpty().withMessage('Имя обязательно')
    .isLength({ min: 3, max: 50 }).withMessage('Имя должно быть от 3 до 50 символов'),
  body('patronymic')
    .trim()
    .optional()
    .isLength({ min: 3, max: 50 }).withMessage('Отчество должно быть от 3 до 50 символов'),
  body('date_of_birth')
    .notEmpty().withMessage('Дата рождения обязательна')
    .isISO8601().withMessage('Неверный формат даты рождения')
    .custom((value, { req }) => {
      const birthDate = new Date(value);
      const now = new Date();
      
      if (birthDate > now) {
        throw new Error('Дата рождения не может быть в будущем');
      }
      return true;
    }),
  body('date_of_death')
    .optional()
    .isISO8601().withMessage('Неверный формат даты смерти')
    .custom((value, { req }) => {
      const deathDate = new Date(value);
      const birthDate = new Date(req.body.date_of_birth);
      const now = new Date();
      
      if (deathDate > now) {
        throw new Error('Дата смерти не может быть в будущем');
      }
      
      if (deathDate <= birthDate) {
        throw new Error('Дата смерти должна быть позже даты рождения');
      }
      
      return true;
    })
];

// Валидация ID автора
exports.validateAuthorId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Неверный ID автора')
    .custom(async (value) => {
      const author = await Author.findByPk(value);
      if (!author) {
        throw new Error('Автор не найден');
      }
      return true;
    })
];