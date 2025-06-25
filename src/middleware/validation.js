const { validationResult } = require('express-validator');
const { body, param } = require('express-validator');
const { Genre, Artwork, Exhibition, Author, Style } = require('../models');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validateRegister = [
    body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Неверный формат email'),
    body('password').trim().notEmpty().withMessage('Пароль обязателен').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов'),
    body('surname').trim().notEmpty().withMessage('Фамилия обязательна').isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').trim().notEmpty().withMessage('Имя обязательно').isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов')
];

const validateLogin = [
    body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Неверный формат email'),
    body('password').trim().notEmpty().withMessage('Пароль обязателен')
];

const validatePasswordChange = [
    body('currentPassword').trim().notEmpty().withMessage('Текущий пароль обязателен'),
    body('newPassword').trim().notEmpty().withMessage('Новый пароль обязателен').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов')
];

const validateCreateUser = [
    body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Неверный формат email'),
    body('password').trim().notEmpty().withMessage('Пароль обязателен').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов'),
    body('surname').trim().notEmpty().withMessage('Фамилия обязательна').isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').trim().notEmpty().withMessage('Имя обязательно').isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional({ nullable: true }).trim().custom((value) => {
        if (value === null || value === '') {
            return true;
        }
        if (value.length < 2 || value.length > 50) {
            throw new Error('Отчество должно быть от 2 до 50 символов');
        }
        return true;
    }),
    body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Неверная роль пользователя')
];

const validateStyle = [
    body('name').trim().notEmpty().withMessage('Название стиля обязательно').isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов')
];

const validateStyleUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов')
];

const validateStyleId = [
    param('id').isInt().withMessage('ID стиля должен быть числом')
];

const validateGenre = [
    body('name').trim().notEmpty().withMessage('Название жанра обязательно').isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов')
];

const validateGenreUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    body().custom((value, { req }) => {
        if (!req.body.name) {
            throw new Error('Поле "name" должно быть передано');
        }
        return true;
    })
];

const validateGenreId = [
    param('id').isInt().withMessage('ID жанра должен быть числом').custom(async (id) => {
        const genre = await Genre.findByPk(id);
        if (!genre) {
            throw new Error('Жанр с указанным ID не найден');
        }
        return true;
    })
];

const validateAuthor = [
    body('surname').trim().notEmpty().withMessage('Фамилия автора обязательна').isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').trim().notEmpty().withMessage('Имя автора обязательно').isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('date_of_birth').isDate().withMessage('Неверный формат даты рождения'),
    body('date_of_death').optional().isDate().withMessage('Неверный формат даты смерти').custom((value, { req }) => {
        if (value && new Date(value) > new Date()) {
            throw new Error('Дата смерти не может быть в будущем');
        }
        return true;
    })
];

const validateAuthorUpdate = [
    body('surname').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional({ nullable: true }).trim().custom((value) => {
        if (value === null || value === '') {
            return true;
        }
        if (value.length < 2 || value.length > 50) {
            throw new Error('Отчество должно быть от 2 до 50 символов');
        }
        return true;
    }),
    body('date_of_birth').isDate().withMessage('Неверный формат даты рождения'),
    body('date_of_death').optional().isDate().withMessage('Неверный формат даты смерти').custom((value, { req }) => {
        if (value && new Date(value) > new Date()) {
            throw new Error('Дата смерти не может быть в будущем');
        }
        return true;
    })
];

const validateAuthorId = [
    param('id').isInt().withMessage('ID автора должен быть числом')
];

const validateArtwork = [
    body('title').trim().notEmpty().withMessage('Название произведения обязательно').isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('width').notEmpty().withMessage('Ширина произведения обязательна').isFloat({ min: 0 }).withMessage('Ширина должна быть положительным числом'),
    body('height').notEmpty().withMessage('Высота произведения обязательна').isFloat({ min: 0 }).withMessage('Высота должна быть положительным числом'),
    body('creation_year').notEmpty().withMessage('Год создания произведения обязателен').isInt({ max: new Date().getFullYear() }).withMessage('Неверный год создания'),
    body('author_id').isInt().withMessage('ID автора должен быть числом'),
    body('style_id').isInt().withMessage('ID стиля должен быть числом'),
    body('genre_id').isInt().withMessage('ID жанра должен быть числом'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('exhibition_id').optional().isInt().withMessage('ID выставки должен быть числом')
];

const validateArtworkId = [
    param('id').isInt().withMessage('ID произведения должен быть числом')
];

const validateArtworkUpdate = [
    body('title').optional().trim().notEmpty().withMessage('Название произведения обязательно').isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('width').optional().isFloat({ min: 0 }).withMessage('Ширина должна быть положительным числом'),
    body('height').optional().isFloat({ min: 0 }).withMessage('Высота должна быть положительным числом'),
    body('creation_year').optional().isInt({ max: new Date().getFullYear() }).withMessage('Неверный год создания'),
    body('author_id').optional().isInt().withMessage('ID автора должен быть числом'),
    body('style_id').optional().isInt().withMessage('ID стиля должен быть числом'),
    body('genre_id').optional().isInt().withMessage('ID жанра должен быть числом'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('image_path').optional().trim().notEmpty().withMessage('Путь к изображению обязателен'),
    body('exhibition_id').optional().isInt().withMessage('ID выставки должен быть числом')
];

const validateExhibition = [
    body('title').trim().notEmpty().withMessage('Название выставки обязательно').isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('location').trim().notEmpty().withMessage('Место проведения обязательно').isLength({ min: 2, max: 100 }).withMessage('Место проведения должно быть от 2 до 100 символов'),
    body('poster_path').trim().notEmpty().withMessage('Путь к афише обязателен').isLength({ max: 255 }).withMessage('Путь к афише не должен превышать 255 символов'),
    body('start_date').isDate().withMessage('Неверный формат даты начала'),
    body('end_date').isDate().withMessage('Неверный формат даты окончания').custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.start_date)) {
            throw new Error('Дата окончания должна быть позже даты начала');
        }
        return true;
    }),
    body('ticket_price').isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
    body('total_tickets').isInt({ min: 0 }).withMessage('Количество билетов должно быть положительным числом'),
    body('status').optional().isIn(['upcoming', 'active', 'completed']).withMessage('Неверный статус выставки'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('opening_time').notEmpty().withMessage('Время открытия обязательно').matches(/^\d{2}:\d{2}$/).withMessage('Время открытия должно быть в формате ЧЧ:ММ'),
    body('closing_time').notEmpty().withMessage('Время закрытия обязательно').matches(/^\d{2}:\d{2}$/).withMessage('Время закрытия должно быть в формате ЧЧ:ММ').custom((value, { req }) => {
        if (req.body.opening_time && value <= req.body.opening_time) {
            throw new Error('Время закрытия должно быть позже времени открытия');
        }
        return true;
    })
];

const validateExhibitionUpdate = [
    body('title').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('location').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Место проведения должно быть от 2 до 100 символов'),
    body('poster_path').optional().trim().notEmpty().withMessage('Путь к афише обязателен').isLength({ max: 255 }).withMessage('Путь к афише не должен превышать 255 символов'),
    body('start_date').optional().isDate().withMessage('Неверный формат даты начала'),
    body('end_date').optional().isDate().withMessage('Неверный формат даты окончания').custom((value, { req }) => {
        if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
            throw new Error('Дата окончания должна быть позже даты начала');
        }
        return true;
    }),
    body('ticket_price').optional().isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
    body('total_tickets').optional().isInt({ min: 0 }).withMessage('Количество билетов должно быть положительным числом'),
    body('status').optional().isIn(['upcoming', 'active', 'completed']).withMessage('Неверный статус выставки'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('opening_time').optional().matches(/^\d{2}:\d{2}$/).withMessage('Время открытия должно быть в формате ЧЧ:ММ'),
    body('closing_time').optional().matches(/^\d{2}:\d{2}$/).withMessage('Время закрытия должно быть в формате ЧЧ:ММ').custom((value, { req }) => {
        if (req.body.opening_time && value <= req.body.opening_time) {
            throw new Error('Время закрытия должно быть позже времени открытия');
        }
        return true;
    })
];

const validateExhibitionId = [
    param('id').isInt().withMessage('ID выставки должен быть числом')
];

const validateUserUpdate = [
    body('surname').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional({ nullable: true }).trim().custom((value) => {
        if (value === null || value === '') {
            return true;
        }
        if (value.length < 2 || value.length > 50) {
            throw new Error('Отчество должно быть от 2 до 50 символов');
        }
        return true;
    }),
    body('email').optional().trim().isEmail().withMessage('Неверный формат email'),
    body('password').optional().trim().isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов'),
    body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Неверная роль пользователя')
];

const validateUserId = [
    param('id').isInt().withMessage('ID пользователя должен быть числом')
];

const validateTicket = [
    body('exhibition_id').toInt().isInt().withMessage('ID выставки должен быть числом'),
    body('quantity').toInt().isInt({ min: 1 }).withMessage('Количество билетов должно быть положительным числом')
];

const validateTicketId = [
    param('id').isInt().withMessage('ID билета должен быть числом')
];

module.exports = {
    validate,
    validateRegister,
    validateLogin,
    validatePasswordChange,
    validateCreateUser,
    validateStyle,
    validateStyleUpdate,
    validateStyleId,
    validateGenre,
    validateGenreUpdate,
    validateGenreId,
    validateAuthor,
    validateAuthorUpdate,
    validateAuthorId,
    validateArtwork,
    validateArtworkId,
    validateArtworkUpdate,
    validateExhibition,
    validateExhibitionUpdate,
    validateExhibitionId,
    validateUserUpdate,
    validateUserId,
    validateTicket,
    validateTicketId
};