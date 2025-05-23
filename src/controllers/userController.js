const { User, Ticket, Exhibition } = require('../models');
const { Op, ValidationError } = require('sequelize');
const { validatePassword, validateEmail } = require('../middleware/validation');

// Функция для фильтрации чувствительных данных
const filterSensitiveData = (user) => {
  const { password, ...userWithoutSensitiveData } = user.toJSON();
  return userWithoutSensitiveData;
};

// Создание нового пользователя (админская операция)
exports.createUser = async (req, res) => {
  try {
    // Проверка роли админа
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Требуются права администратора'
      });
    }

    if (req.body.email) {
      validateEmail(req.body.email);
      
      const existingUser = await User.findOne({
        where: { email: req.body.email }
      });
      
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Пользователь с таким email уже существует'
        });
      }
    }

    if (req.body.password) {
      validatePassword(req.body.password);
    }

    if (req.body.role && !['admin', 'manager', 'user'].includes(req.body.role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректная роль пользователя. Допустимые значения: admin, manager, user'
      });
    }

    const newUser = await User.create(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Пользователь успешно создан',
      data: {
        user: filterSensitiveData(newUser)
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: 'Ошибка валидации данных',
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    if (err.message.includes('Пароль') || err.message.includes('email')) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    console.error('Create user error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Не удалось создать пользователя'
    });
  }
};

// Получение всех пользователей с пагинацией
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    
    if (req.query.role) {
      if (!['admin', 'manager', 'user'].includes(req.query.role)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная роль пользователя. Допустимые значения: admin, manager, user'
        });
      }
      where.role = req.query.role;
    }

    if (req.query.email) {
      where.email = { [Op.like]: `%${req.query.email}%` };
    }

    if (req.query.surname) {
      where.surname = { [Op.like]: `%${req.query.surname}%` };
    }
    if (req.query.first_name) {
      where.first_name = { [Op.like]: `%${req.query.first_name}%` };
    }

    if (req.query.created_after) {
      where.created_at = {
        ...where.created_at,
        [Op.gte]: new Date(req.query.created_after)
      };
    }
    if (req.query.created_before) {
      where.created_at = {
        ...where.created_at,
        [Op.lte]: new Date(req.query.created_before)
      };
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [{
        model: Ticket,
        attributes: ['id'],
        required: false
      }]
    });

    const usersWithStats = users.map(user => {
      const userData = filterSensitiveData(user);
      return {
        ...userData,
        statistics: {
          total_tickets: user.Tickets ? user.Tickets.length : 0
        }
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        users: usersWithStats,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
          limit
        }
      }
    });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении списка пользователей'
    });
  }
};

// Получение пользователя по ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
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
        message: 'Пользователь с указанным ID не найден'
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
    console.error('Get user error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации о пользователе'
    });
  }
};

// Обновление пользователя по ID
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь с указанным ID не найден'
      });
    }

    if (req.body.email && req.body.email !== user.email) {
      validateEmail(req.body.email);
      
      const existingUser = await User.findOne({
        where: {
          email: req.body.email,
          id: { [Op.ne]: req.params.id }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Пользователь с таким email уже существует'
        });
      }
    }

    if (req.body.password) {
      validatePassword(req.body.password);
    }

    await user.update(req.body);

    const updatedUser = await User.findByPk(req.params.id, {
      include: [{
        model: Ticket,
        attributes: ['id']
      }]
    });

    res.status(200).json({
      status: 'success',
      message: 'Пользователь успешно обновлен',
      data: {
        user: filterSensitiveData(updatedUser)
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: 'Ошибка валидации данных',
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    if (err.message.includes('Пароль') || err.message.includes('email')) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    console.error('Update user error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении пользователя'
    });
  }
};

// Удаление пользователя по ID
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{
        model: Ticket,
        attributes: ['id']
      }]
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь с указанным ID не найден'
      });
    }

    if (user.Tickets.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить пользователя с забронированными билетами'
      });
    }

    await user.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Пользователь успешно удален',
      data: null
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении пользователя'
    });
  }
};

// Обновление профиля текущего пользователя
exports.updateMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }

    if (req.body.role) {
      delete req.body.role;
    }

    if (req.body.email && req.body.email !== user.email) {
      validateEmail(req.body.email);
      
      const existingUser = await User.findOne({
        where: {
          email: req.body.email,
          id: { [Op.ne]: req.user.id }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Пользователь с таким email уже существует'
        });
      }
    }

    if (req.body.password) {
      validatePassword(req.body.password);
    }

    await user.update(req.body);

    const updatedUser = await User.findByPk(req.user.id, {
      include: [{
        model: Ticket,
        attributes: ['id']
      }]
    });

    res.status(200).json({
      status: 'success',
      message: 'Профиль успешно обновлен',
      data: {
        user: filterSensitiveData(updatedUser)
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: 'Ошибка валидации данных',
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    if (err.message.includes('Пароль') || err.message.includes('email')) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    console.error('Update me error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении профиля'
    });
  }
};