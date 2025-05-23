const { User, Ticket, Exhibition } = require('../models');
const jwt = require('jsonwebtoken');
const { validatePassword, validateEmail } = require('../middleware/validation');

// Функция для фильтрации чувствительных данных
const filterSensitiveData = (user) => {
  const { password, ...userWithoutSensitiveData } = user.toJSON();
  return userWithoutSensitiveData;
};

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
  
  res.status(statusCode).json({
    status: 'success',
    data: {
      user: filterSensitiveData(user),
      token,
      refreshToken
    }
  });
};

// Регистрация нового пользователя
exports.register = async (req, res) => {
  try {
    const { email, password, surname, first_name, patronymic } = req.body;

    validateEmail(email);
    validatePassword(password);

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Пользователь с таким email уже существует'
      });
    }

    const newUser = await User.create({
      email,
      password,
      surname,
      first_name,
      patronymic,
      role: 'user'
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        status: 'error',
        message: err.errors[0].message
      });
    }
    if (err.message.includes('Пароль') || err.message.includes('email')) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
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

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Пожалуйста, укажите email и пароль'
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный email или пароль'
      });
    }

    createSendToken(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
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

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }

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
    console.error('Refresh token error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Текущий и новый пароли обязательны'
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user || !(await user.checkPassword(currentPassword))) {
      return res.status(401).json({
        status: 'error',
        message: 'Неверный текущий пароль'
      });
    }

    validatePassword(newPassword);
    user.password = newPassword;
    await user.save();

    createSendToken(user, 200, res);
  } catch (err) {
    if (err.message.includes('Пароль')) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    console.error('Change password error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};

// Получение данных текущего пользователя
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Ticket,
        attributes: ['id', 'exhibition_id', 'quantity', 'booking_date', 'total_price'],
        include: [{
          model: Exhibition,
          attributes: ['id', 'title', 'start_date', 'end_date']
        }]
      }]
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }

    const userWithStats = {
      ...filterSensitiveData(user),
      statistics: {
        total_tickets: user.Tickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        user: userWithStats
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
};