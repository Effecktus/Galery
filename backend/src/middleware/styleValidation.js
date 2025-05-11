const { body, param } = require('express-validator');
const { Op } = require('sequelize');
const Style = require('../models/Style');

// Валидация для создания и обновления стиля
exports.validateStyle = [
  body('name')
    .trim()
    .notEmpty().withMessage('Название стиля обязательно')
    .isLength({ min: 3, max: 50 }).withMessage('Название стиля должно быть от 3 до 50 символов')
    .custom(async (value, { req }) => {
      const existingStyle = await Style.findOne({
        where: {
          name: value,
          id: { [Op.ne]: req.params.id }
        }
      });
      if (existingStyle) {
        throw new Error('Такой стиль уже существует');
      }
      return true;
    })
];

// Валидация для ID стиля
exports.validateStyleId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Неверный ID стиля')
];
