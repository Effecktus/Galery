const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Функция для фильтрации чувствительных данных
const filterSensitiveData = (user) => {
  const { password, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
};

// Создание нового пользователя
exports.createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        user: filterSensitiveData(newUser)
      }
    });
  } catch(err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    }); 
  }
};

// Получение всех пользователей с пагинацией
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      data: {
        users: users.map(filterSensitiveData),
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Получение пользователя по ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        user: filterSensitiveData(user)
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Обновление пользователя
exports.updateUser = async (req, res) => {
  try {
    // Сначала проверяем существование пользователя
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }

    // Фильтруем поля, которые можно обновить
    const allowedFields = ['surname', 'first_name', 'patronymic', 'email', 'password', 'role'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    }

    // Если есть пароль, хэшируем его вручную
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Обновляем пользователя с включенной валидацией
    await user.update(updateData);
    
    // Получаем обновленного пользователя
    const updatedUser = await User.findByPk(req.params.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: filterSensitiveData(updatedUser)
      }
    });
  } catch(err) {
    console.error('Update error:', err);
    res.status(400).json({
      status: 'error',
      message: err.message,
      errors: err.errors?.map(e => ({ message: e.message })) || [{ message: err.message }]
    });
  }
};

// Удаление пользователя
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({
      where: { id: req.params.id }
    });
    if (deleted === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};