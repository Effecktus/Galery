const { validationResult } = require('express-validator');
const { body, param } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validateRegister = [
    body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Неверный формат email'),
    body('password').trim().notEmpty().withMessage('Пароль обязателен').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/).withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'),
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
    body('newPassword').trim().notEmpty().withMessage('Новый пароль обязателен').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/).withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру')
];

const validateAdminCreateUser = [
    body('email').trim().notEmpty().withMessage('Email обязателен').isEmail().withMessage('Неверный формат email'),
    body('password').trim().notEmpty().withMessage('Пароль обязателен').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/).withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'),
    body('surname').trim().notEmpty().withMessage('Фамилия обязательна').isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').trim().notEmpty().withMessage('Имя обязательно').isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Неверная роль пользователя')
];

const validateStyle = [
    body('name').trim().notEmpty().withMessage('Название стиля обязательно').isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов')
];

const validateStyleUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов')
];

const validateStyleId = [
    param('id').isInt().withMessage('ID стиля должен быть числом')
];

const validateGenre = [
    body('name').trim().notEmpty().withMessage('Название жанра обязательно').isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов')
];

const validateGenreUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов')
];

const validateGenreId = [
    param('id').isInt().withMessage('ID жанра должен быть числом')
];

const validateAuthor = [
    body('surname').trim().notEmpty().withMessage('Фамилия автора обязательна').isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').trim().notEmpty().withMessage('Имя автора обязательно').isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('biography').optional().trim().isLength({ max: 2000 }).withMessage('Биография не должна превышать 2000 символов'),
    body('birth_date').optional().isDate().withMessage('Неверный формат даты рождения'),
    body('death_date').optional().isDate().withMessage('Неверный формат даты смерти')
];

const validateAuthorUpdate = [
    body('surname').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('biography').optional().trim().isLength({ max: 2000 }).withMessage('Биография не должна превышать 2000 символов'),
    body('birth_date').optional().isDate().withMessage('Неверный формат даты рождения'),
    body('death_date').optional().isDate().withMessage('Неверный формат даты смерти')
];

const validateAuthorId = [
    param('id').isInt().withMessage('ID автора должен быть числом')
];

const validateArtwork = [
    body('title').trim().notEmpty().withMessage('Название произведения обязательно').isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('author_id').isInt().withMessage('ID автора должен быть числом'),
    body('style_id').isInt().withMessage('ID стиля должен быть числом'),
    body('genre_id').isInt().withMessage('ID жанра должен быть числом'),
    body('exhibition_id').optional().isInt().withMessage('ID выставки должен быть числом'),
    body('creation_year').optional().isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Неверный год создания'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом')
];

const validateArtworkId = [
    param('id').isInt().withMessage('ID произведения должен быть числом')
];

const validateArtworkUpdate = [
    body('title').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('author_id').optional().isInt().withMessage('ID автора должен быть числом'),
    body('style_id').optional().isInt().withMessage('ID стиля должен быть числом'),
    body('genre_id').optional().isInt().withMessage('ID жанра должен быть числом'),
    body('exhibition_id').optional().isInt().withMessage('ID выставки должен быть числом'),
    body('creation_year').optional().isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Неверный год создания'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом')
];

const validateExhibition = [
    body('title').trim().notEmpty().withMessage('Название выставки обязательно').isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('start_date').isDate().withMessage('Неверный формат даты начала'),
    body('end_date').isDate().withMessage('Неверный формат даты окончания').custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.start_date)) {
            throw new Error('Дата окончания должна быть позже даты начала');
        }
        return true;
    }),
    body('price').isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
    body('remaining_tickets').isInt({ min: 0 }).withMessage('Количество оставшихся билетов должно быть неотрицательным числом'),
    body('artwork_ids').isArray().withMessage('artwork_ids должен быть массивом').notEmpty().withMessage('Должно быть указано хотя бы одно произведение')
];

const validateExhibitionUpdate = [
    body('title').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('description').optional().trim().isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('start_date').optional().isDate().withMessage('Неверный формат даты начала'),
    body('end_date').optional().isDate().withMessage('Неверный формат даты окончания').custom((value, { req }) => {
        if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
            throw new Error('Дата окончания должна быть позже даты начала');
        }
        return true;
    }),
    body('price').optional().isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
    body('remaining_tickets').optional().isInt({ min: 0 }).withMessage('Количество оставшихся билетов должно быть неотрицательным числом'),
    body('artwork_ids').optional().isArray().withMessage('artwork_ids должен быть массивом')
];

const validateExhibitionId = [
    param('id').isInt().withMessage('ID выставки должен быть числом')
];

const validateUserUpdate = [
    body('email').optional().trim().isEmail().withMessage('Неверный формат email'),
    body('password').optional().trim().isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/).withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру'),
    body('surname').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Неверная роль пользователя')
];

const validateUserId = [
    param('id').isInt().withMessage('ID пользователя должен быть числом')
];

const validateTicket = [
    body('exhibition_id').isInt().withMessage('ID выставки должен быть числом'),
    body('quantity').isInt({ min: 1 }).withMessage('Количество билетов должно быть положительным числом')
];

const validateTicketId = [
    param('id').isInt().withMessage('ID билета должен быть числом')
];

module.exports = {
    validate,
    validateRegister,
    validateLogin,
    validatePasswordChange,
    validateAdminCreateUser,
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