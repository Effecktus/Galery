const { body, param } = require('express-validator');
const User = require('../models/User');

// Валидация для аутентификации
exports.validateAuth = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Неверный формат email')
    .normalizeEmail(),
  body('password')
    .trim()
    .notEmpty().withMessage('Пароль обязателен')
];

// Валидация для создания и обновления пользователя
exports.validateUser = [
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
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Неверный формат email')
    .normalizeEmail()
    .custom(async (value, { req }) => {
      const user = await User.findOne({ where: { email: value } });
      if (user && user.id !== parseInt(req.params?.id)) {
        throw new Error('Email уже используется');
      }
      return true;
    }),
  body('password')
    .trim()
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ'),
  body('role')
    .trim()
    .notEmpty().withMessage('Роль обязательна')
    .isIn(['admin', 'manager', 'user']).withMessage('Неверная роль')
];

// Валидация для обновления пользователя
exports.validateUserUpdate = [
  body('surname')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Фамилия должна быть от 3 до 50 символов'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Имя должно быть от 3 до 50 символов'),
  body('patronymic')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Отчество должно быть от 3 до 50 символов'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Неверный формат email')
    .normalizeEmail()
    .custom(async (value, { req }) => {
      const user = await User.findOne({ where: { email: value } });
      if (user && user.id !== parseInt(req.params?.id)) {
        throw new Error('Email уже используется');
      }
      return true;
    }),
  body('password')
    .optional()
    .trim()
    .isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'user']).withMessage('Неверная роль')
];

// Валидация ID пользователя
exports.validateUserId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Неверный ID пользователя')
];