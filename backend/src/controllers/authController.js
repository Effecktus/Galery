const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Функция для создания JWT токена
const signToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Функция для отправки ответа с токеном
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  
  // Удаляем пароль из ответа
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
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
        message: 'Please provide all required fields'
      });
    }
    
    // Проверяем, существует ли уже пользователь с таким email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already in use'
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

    // Создаем и отправляем токен
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
        message: 'Please provide email and password'
      });
    }

    // 2) Проверяем, существует ли пользователь и правильный ли пароль
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }
    
    const isPasswordCorrect = await user.checkPassword(password);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // 3) Создаем и отправляем токен
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