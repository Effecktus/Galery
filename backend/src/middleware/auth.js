const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// Middleware для проверки аутентификации через JWT
exports.protect = async (req, res, next) => {
  try {
    // 1) Получаем токен из заголовка Authorization
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Верификация токена
    const decoded = await promisify(jwt.verify)(
      token, 
      process.env.JWT_SECRET
    );

    // 3) Проверяем, существует ли пользователь
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user no longer exists.'
      });
    }

    // 4) Добавляем пользователя в request
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed. Please log in again.'
    });
  }
};

// Middleware для проверки ролей
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
}; 