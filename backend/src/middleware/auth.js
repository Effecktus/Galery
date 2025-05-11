const User = require('../models/User');

// Middleware для проверки аутентификации
exports.protect = async (req, res, next) => {
  try {
    // Проверяем, авторизован ли пользователь
    if (!req.session.userId) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // Получаем пользователя из базы данных
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user no longer exists.'
      });
    }

    // Добавляем пользователя в request
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