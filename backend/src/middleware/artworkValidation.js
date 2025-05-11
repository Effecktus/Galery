const { body, param } = require('express-validator');
const { Author, Style, Genre, Exhibition } = require('../models');

// Валидация для создания и обновления произведения искусства
exports.validateArtwork = [
  body('title')
    .trim()
    .notEmpty().withMessage('Название обязательно')
    .isLength({ min: 3, max: 100 }).withMessage('Название должно быть от 3 до 100 символов'),
  body('width')
    .optional()
    .isDecimal({ min: 0 }).withMessage('Ширина должна быть положительным числом'),
  body('height')
    .optional()
    .isDecimal({ min: 0 }).withMessage('Высота должна быть положительным числом'),
  body('author_id')
    .notEmpty().withMessage('ID автора обязателен')
    .isInt({ min: 1 }).withMessage('Неверный ID автора')
    .custom(async (value) => {
      const author = await Author.findByPk(value);
      if (!author) {
        throw new Error('Автор не найден');
      }
      return true;
    }),
  body('creation_year')
    .optional()
    .isInt({max: new Date().getFullYear() })
    .withMessage('Год создания должен быть в прошлом'),
  body('style_id')
    .notEmpty().withMessage('ID стиля обязателен')
    .isInt({ min: 1 }).withMessage('Неверный ID стиля')
    .custom(async (value) => {
      const style = await Style.findByPk(value);
      if (!style) {
        throw new Error('Стиль не найден');
      }
      return true;
    }),
  body('genre_id')
    .notEmpty().withMessage('ID жанра обязателен')
    .isInt({ min: 1 }).withMessage('Неверный ID жанра')
    .custom(async (value) => {
      const genre = await Genre.findByPk(value);
      if (!genre) {
        throw new Error('Жанр не найден');
      }
      return true;
    }),
  body('description')
    .optional()
    .isLength({ max: 255 }).withMessage('Описание должно быть не более 255 символов'),
  body('image_path')
    .notEmpty().withMessage('Путь к изображению обязателен')
    .isLength({ max: 255 }).withMessage('Путь к изображению должен быть не более 255 символов'),
  body('exhibition_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Неверный ID выставки')
    .custom(async (value) => {
      const exhibition = await Exhibition.findByPk(value);
      if (!exhibition) {
        throw new Error('Выставка не найдена');
      }
      return true;
    })
];

// Валидация ID произведения искусства
exports.validateArtworkId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Неверный ID произведения искусства')
];