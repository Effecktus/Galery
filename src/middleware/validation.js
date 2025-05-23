const { validationResult } = require('express-validator');
const { body, param } = require('express-validator');

// Общая функция валидации
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Валидация для регистрации
const validateRegister = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email обязателен')
        .isEmail().withMessage('Неверный формат email'),
    body('password')
        .trim()
        .notEmpty().withMessage('Пароль обязателен')
        .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/)
        .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ'),
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
        .isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов')
];

// Валидация для входа
const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email обязателен')
        .isEmail().withMessage('Неверный формат email'),
    body('password')
        .trim()
        .notEmpty().withMessage('Пароль обязателен')
];

// Валидация для смены пароля
const validatePasswordChange = [
    body('currentPassword')
        .trim()
        .notEmpty().withMessage('Текущий пароль обязателен'),
    body('newPassword')
        .trim()
        .notEmpty().withMessage('Новый пароль обязателен')
        .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/)
        .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ')
];

// Валидация для стилей
const validateStyle = [
    body('name')
        .trim()
        .notEmpty().withMessage('Название стиля обязательно')
        .isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов')
];

const validateStyleId = [
    param('id')
        .isInt().withMessage('ID стиля должен быть числом')
];

// Валидация для жанров
const validateGenre = [
    body('name')
        .trim()
        .notEmpty().withMessage('Название жанра обязательно')
        .isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Описание не должно превышать 1000 символов')
];

const validateGenreId = [
    param('id')
        .isInt().withMessage('ID жанра должен быть числом')
];

// Валидация для авторов
const validateAuthor = [
    body('surname')
        .trim()
        .notEmpty().withMessage('Фамилия автора обязательна')
        .isLength({ min: 2, max: 50 }).withMessage('Фамилия должна быть от 2 до 50 символов'),
    body('first_name')
        .trim()
        .notEmpty().withMessage('Имя автора обязательно')
        .isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
    body('patronymic')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Отчество должно быть от 2 до 50 символов'),
    body('biography')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Биография не должна превышать 2000 символов'),
    body('birth_date')
        .optional()
        .isDate().withMessage('Неверный формат даты рождения'),
    body('death_date')
        .optional()
        .isDate().withMessage('Неверный формат даты смерти')
];

const validateAuthorId = [
    param('id')
        .isInt().withMessage('ID автора должен быть числом')
];

// Валидация для произведений искусства
const validateArtwork = [
    body('title')
        .trim()
        .notEmpty().withMessage('Название произведения обязательно')
        .isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('author_id')
        .isInt().withMessage('ID автора должен быть числом'),
    body('style_id')
        .isInt().withMessage('ID стиля должен быть числом'),
    body('genre_id')
        .isInt().withMessage('ID жанра должен быть числом'),
    body('creation_year')
        .optional()
        .isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Неверный год создания'),
    body('price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом')
];

const validateArtworkId = [
    param('id')
        .isInt().withMessage('ID произведения должен быть числом')
];

const validateArtworkUpdate = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('author_id')
        .optional()
        .isInt().withMessage('ID автора должен быть числом'),
    body('style_id')
        .optional()
        .isInt().withMessage('ID стиля должен быть числом'),
    body('genre_id')
        .optional()
        .isInt().withMessage('ID жанра должен быть числом'),
    body('creation_year')
        .optional()
        .isInt({ min: 1000, max: new Date().getFullYear() }).withMessage('Неверный год создания'),
    body('price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом')
];

// Валидация для выставок
const validateExhibition = [
    body('title')
        .trim()
        .notEmpty().withMessage('Название выставки обязательно')
        .isLength({ min: 2, max: 100 }).withMessage('Название должно быть от 2 до 100 символов'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Описание не должно превышать 2000 символов'),
    body('start_date')
        .isDate().withMessage('Неверный формат даты начала'),
    body('end_date')
        .isDate().withMessage('Неверный формат даты окончания')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.start_date)) {
                throw new Error('Дата окончания должна быть позже даты начала');
            }
            return true;
        }),
    body('price')
        .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
    body('artwork_ids')
        .isArray().withMessage('artwork_ids должен быть массивом')
        .notEmpty().withMessage('Должно быть указано хотя бы одно произведение')
];

const validateExhibitionId = [
    param('id')
        .isInt().withMessage('ID выставки должен быть числом')
];

const validateStatusUpdate = [
    body('status')
        .isIn(['planned', 'active', 'completed', 'cancelled']).withMessage('Неверный статус выставки')
];

// Валидация для обновления пользователя
const validateUserUpdate = [
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Неверный формат email'),
    body('password')
        .optional()
        .trim()
        .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/)
        .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ'),
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
    body('role')
        .optional()
        .isIn(['user', 'admin']).withMessage('Неверная роль пользователя')
];

// Валидация для ID пользователя
const validateUserId = [
    param('id')
        .isInt().withMessage('ID пользователя должен быть числом')
];

// Валидация для билетов
const validateTicket = [
    body('exhibition_id')
        .isInt().withMessage('ID выставки должен быть числом'),
    body('quantity')
        .isInt({ min: 1 }).withMessage('Количество билетов должно быть положительным числом')
];

const validateTicketId = [
    param('id')
        .isInt().withMessage('ID билета должен быть числом')
];

module.exports = {
    validate,
    validateRegister,
    validateLogin,
    validatePasswordChange,
    validateStyle,
    validateStyleId,
    validateGenre,
    validateGenreId,
    validateAuthor,
    validateAuthorId,
    validateArtwork,
    validateArtworkId,
    validateArtworkUpdate,
    validateExhibition,
    validateExhibitionId,
    validateStatusUpdate,
    validateUserUpdate,
    validateUserId,
    validateTicket,
    validateTicketId
}; 