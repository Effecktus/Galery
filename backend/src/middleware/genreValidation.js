const { body, param } = require('express-validator');
const { Op } = require('sequelize');
const Genre = require('../models/Genre');

// Валидация для создания и обновления жанра
exports.validateGenre = [
  body('name')
    .trim()
    .notEmpty().withMessage('Название жанра обязательно')
    .isLength({ min: 3, max: 50 }).withMessage('Название жанра должно быть от 3 до 50 символов')
    .custom(async (value, { req }) => {
      const existingGenre = await Genre.findOne({
        where: {
          name: value,
          id: { [Op.ne]: req.params.id }
        }
      });
      if (existingGenre) {
        throw new Error('Такой жанр уже существует');
      }
      return true;
    })
];

// Валидация для ID жанра
exports.validateGenreId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Неверный ID жанра')
];
