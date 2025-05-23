const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validationResult, body, param } = require('express-validator');

// Переименовываем auth в protect
const protect = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.token || 
                     req.session?.token;

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        res.locals.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Пожалуйста, авторизуйтесь' });
    }
};

// Переименовываем checkRole в restrictTo
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Пожалуйста, авторизуйтесь' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Доступ запрещен' });
        }

        next();
    };
};

// Добавляем функции валидации
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validateUser = [
    body('surname')
        .trim()
        .notEmpty().withMessage('Фамилия обязательна')
        .isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name')
        .trim()
        .notEmpty().withMessage('Имя обязательно')
        .isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email обязателен')
        .isEmail().withMessage('Неверный формат email')
        .normalizeEmail()
        .custom(async (value) => {
            const user = await User.findOne({ where: { email: value } });
            if (user) {
                throw new Error('Email уже используется');
            }
            return true;
        }),
    body('password')
        .trim()
        .notEmpty().withMessage('Пароль обязателен')
        .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
        .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'),
    body('role')
        .optional()
        .isIn(['admin', 'manager', 'user']).withMessage('Неверная роль'),
    validate
];

const validateUserId = [
    param('id')
        .isInt().withMessage('ID пользователя должен быть числом')
        .custom(async (value) => {
            const user = await User.findByPk(value);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            return true;
        }),
    validate
];

const validateUserUpdate = [
    body('surname')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Неверный формат email')
        .normalizeEmail()
        .custom(async (value, { req }) => {
            const user = await User.findOne({ where: { email: value } });
            if (user && user.id !== parseInt(req.params.id)) {
                throw new Error('Email уже используется');
            }
            return true;
        }),
    body('password')
        .optional()
        .trim()
        .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
        .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'),
    body('role')
        .optional()
        .isIn(['admin', 'manager', 'user']).withMessage('Неверная роль'),
    validate
];

module.exports = {
    protect,
    restrictTo,
    validate,
    validateUser,
    validateUserId,
    validateUserUpdate
}; 