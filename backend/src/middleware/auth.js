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
        message: 'Вы не вошли в систему. Пожалуйста, войдите, чтобы получить доступ.'
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
        message: 'Пользователь больше не существует.'
      });
    }

    // 4) Добавляем пользователя в request
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Недействительный токен. Пожалуйста, войдите заново.'
      });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Срок действия вашего токена истек. Пожалуйста, войдите заново.'
      });
    }
    
    return res.status(401).json({
      status: 'error',
      message: 'Ошибка аутентификации. Пожалуйста, войдите заново.'
    });
  }
};

// Middleware для проверки ролей
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'У вас нет прав для выполнения этого действия.'
      });
    }
    next();
  };
}; 