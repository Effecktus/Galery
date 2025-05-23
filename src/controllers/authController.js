const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Функция для создания access токена
const signToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

// Функция для создания refresh токена
const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Функция для отправки ответа с токенами
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  
  // Удаляем пароль из ответа
  const userWithoutPassword = user.toJSON();
  delete userWithoutPassword.password;

  res.status(statusCode).json({
    status: 'success',
    data: {
      user: userWithoutPassword,
      token,
      refreshToken
    }
  });
};

// Регистрация нового пользователя
exports.register = async (req, res) => {
  try {
    const { email, password, surname, first_name, patronymic } = req.body;

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Пользователь с таким email уже существует'
      });
    }

    // Создаем нового пользователя
    const newUser = await User.create({
      email,
      password,
      surname,
      first_name,
      patronymic,
      role: 'user' // По умолчанию роль - user
    });

    // Отправляем токены
    createSendToken(newUser, 201, res);
  } catch (err) {
    // Проверяем тип ошибки
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        status: 'error',
        message: err.errors[0].message
      });
    }
    
    // Для других ошибок возвращаем 500
    console.error('Registration error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

// Вход пользователя
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Проверяем, существуют ли email и пароль
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Пожалуйста, укажите email и пароль'
      });
    }

    // Проверяем, существует ли пользователь и правильный ли пароль
    const user = await User.findOne({ where: { email } });
    
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный email или пароль'
      });
    }

    // Создаем и отправляем токены
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

// Обновление токена
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Требуется refresh token'
      });
    }

    // Проверяем refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }

    // Создаем и отправляем новые токены
    createSendToken(user, 200, res);
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
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

// Выход пользователя
exports.logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Выход выполнен успешно'
  });
};

// Изменение пароля
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Получаем пользователя
    const user = await User.findByPk(req.user.id);

    // Проверяем текущий пароль
    if (!(await user.checkPassword(currentPassword))) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный текущий пароль'
      });
    }

    // Обновляем пароль
    user.password = newPassword;
    await user.save();

    // Создаем и отправляем новые токены
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

// Получение данных текущего пользователя
exports.getMe = async (req, res) => {
  try {
    // Информация о пользователе доступна из middleware защиты маршрута
    const user = req.user;
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
}; 