const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
    try {
        // Получаем токен из куки
        const token = req.cookies.token;

        if (!token) {
            res.locals.user = null;
            return next();
        }

        // Проверяем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            res.locals.user = null;
            return next();
        }

        // Добавляем пользователя в res.locals
        res.locals.user = user;
        next();
    } catch (err) {
        res.locals.user = null;
        next();
    }
}; 