const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware для проверки JWT токена
const protect = async (req, res, next) => {
    try {
        // Получаем токен из заголовка или куки
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Вы не авторизованы'
            });
        }

        // Проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Пользователь не найден'
            });
        }

        // Добавляем пользователя в запрос
        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'error',
                message: 'Недействительный токен'
            });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Срок действия токена истек'
            });
        }
        next(err);
    }
};

// Middleware для проверки роли
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'У вас нет прав для выполнения этого действия'
            });
        }
        next();
    };
};

module.exports = {
    protect,
    restrictTo
};