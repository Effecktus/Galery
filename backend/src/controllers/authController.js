const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user
    }
  });
};

// Регистрация нового пользователя
exports.signup = async (req, res) => {
  try {
    // Проверяем наличие обязательных полей
    const { surname, first_name, patronymic, email, password, role } = req.body;
    
    if (!surname || !first_name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Пожалуйста, укажите все обязательные поля'
      });
    }
    
    // Проверяем, существует ли уже пользователь с таким email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email уже используется'
      });
    }

    const newUser = await User.create({
      surname,
      first_name,
      patronymic: patronymic || '',
      email,
      password,
      role: role || 'user'
    });

    // Создаем и отправляем токены
    createSendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

// Вход пользователя
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Проверяем, существуют ли email и пароль
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Пожалуйста, укажите email и пароль'
      });
    }

    // 2) Проверяем, существует ли пользователь и правильный ли пароль
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный email или пароль'
      });
    }
    
    const isPasswordCorrect = await user.checkPassword(password);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный email или пароль'
      });
    }

    // 3) Создаем и отправляем токены
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
        message: 'Отсутствует refresh токен'
      });
    }

    // Верифицируем refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Проверяем, существует ли пользователь
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }

    // Создаем новый access token
    const token = signToken(user.id);

    // Удаляем пароль из ответа
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Недействительный refresh token'
      });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Срок действия refresh token истек. Пожалуйста, войдите заново.'
      });
    }

    res.status(401).json({
      status: 'error',
      message: 'Ошибка при обновлении токена'
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