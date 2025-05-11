const User = require('../models/User');

// Регистрация нового пользователя
exports.signup = async (req, res) => {
  try {
    const newUser = await User.create({
      surname: req.body.surname,
      first_name: req.body.first_name,
      patronymic: req.body.patronymic,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'user'
    });

    // Удаляем пароль из ответа
    newUser.password = undefined;

    // Сохраняем ID пользователя в сессии
    req.session.userId = newUser.id;

    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
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
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // 3) Сохраняем ID пользователя в сессии
    req.session.userId = user.id;

    // 4) Удаляем пароль из ответа
    user.password = undefined;

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

// Выход пользователя
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Error logging out'
      });
    }
    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out'
    });
  });
}; 