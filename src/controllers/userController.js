const { User, Ticket } = require('../models');
const bcrypt = require('bcryptjs');
const { Op, ValidationError } = require('sequelize');

// Функция для фильтрации чувствительных данных
const filterSensitiveData = (user) => {
  const { password, reset_token, reset_token_expires, ...userWithoutSensitiveData } = user.toJSON();
  return userWithoutSensitiveData;
};

// Функция для валидации пароля
const validatePassword = (password) => {
  if (!password) return true; // Пароль не обязателен при обновлении
  if (password.length < 8) {
    throw new Error('Пароль должен содержать минимум 8 символов');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Пароль должен содержать хотя бы одну заглавную букву');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Пароль должен содержать хотя бы одну строчную букву');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Пароль должен содержать хотя бы одну цифру');
  }
  return true;
};

// Функция для валидации email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Некорректный формат email');
  }
  return true;
};

// Создание нового пользователя
exports.createUser = async (req, res) => {
  try {
    // Валидация email
    if (req.body.email) {
      validateEmail(req.body.email);
      
      // Проверяем, существует ли пользователь с таким email
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

    // Валидация пароля
    if (req.body.password) {
      validatePassword(req.body.password);
      req.body.password = await bcrypt.hash(req.body.password, 12);
    }

    // Устанавливаем роль по умолчанию, если не указана
    if (!req.body.role) {
      req.body.role = 'user';
    } else if (!['admin', 'manager', 'user'].includes(req.body.role)) {
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
  } catch(err) {
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
    res.status(400).json({
      status: 'error',
      message: 'Не удалось создать пользователя: ' + err.message
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
    
    // Фильтрация по роли
    if (req.query.role) {
      if (!['admin', 'manager', 'user'].includes(req.query.role)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная роль пользователя. Допустимые значения: admin, manager, user'
        });
      }
      where.role = req.query.role;
    }

    // Фильтрация по email
    if (req.query.email) {
      where.email = { [Op.like]: `%${req.query.email}%` };
    }

    // Фильтрация по имени
    if (req.query.surname) {
      where.surname = { [Op.like]: `%${req.query.surname}%` };
    }
    if (req.query.first_name) {
      where.first_name = { [Op.like]: `%${req.query.first_name}%` };
    }

    // Фильтрация по дате регистрации
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

    // Добавляем статистику по билетам
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
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении списка пользователей: ' + err.message
    });
  }
};

// Получение пользователя по ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{
        model: Ticket,
        attributes: ['id', 'exhibition_id', 'status', 'visit_date'],
        include: [{
          model: Ticket.sequelize.models.Exhibition,
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

    // Добавляем статистику
    const userWithStats = {
      ...filterSensitiveData(user),
      statistics: {
        total_tickets: user.Tickets.length,
        active_tickets: user.Tickets.filter(ticket => ticket.status === 'active').length,
        cancelled_tickets: user.Tickets.filter(ticket => ticket.status === 'cancelled').length,
        upcoming_visits: user.Tickets.filter(ticket => 
          ticket.status === 'active' && 
          new Date(ticket.visit_date) > new Date()
        ).length
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        user: userWithStats
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации о пользователе: ' + err.message
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

    // Проверяем email на уникальность
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

    // Валидация и хеширование пароля
    if (req.body.password) {
      validatePassword(req.body.password);
      req.body.password = await bcrypt.hash(req.body.password, 12);
    }

    // Обновляем пользователя
    await user.update(req.body);

    // Получаем обновленного пользователя
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
  } catch(err) {
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
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении пользователя: ' + err.message
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

    // Проверяем, есть ли активные билеты
    const hasActiveTickets = user.Tickets.some(ticket => ticket.status === 'active');
    if (hasActiveTickets) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить пользователя с активными билетами'
      });
    }

    await user.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Пользователь успешно удален',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении пользователя: ' + err.message
    });
  }
};

// Получение профиля текущего пользователя
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Ticket,
        attributes: ['id', 'exhibition_id', 'status', 'visit_date'],
        include: [{
          model: Ticket.sequelize.models.Exhibition,
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

    // Добавляем статистику
    const userWithStats = {
      ...filterSensitiveData(user),
      statistics: {
        total_tickets: user.Tickets.length,
        active_tickets: user.Tickets.filter(ticket => ticket.status === 'active').length,
        cancelled_tickets: user.Tickets.filter(ticket => ticket.status === 'cancelled').length,
        upcoming_visits: user.Tickets.filter(ticket => 
          ticket.status === 'active' && 
          new Date(ticket.visit_date) > new Date()
        ).length
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        user: userWithStats
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении профиля: ' + err.message
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

    // Запрещаем обновление роли через этот метод
    if (req.body.role) {
      delete req.body.role;
    }

    // Проверяем email на уникальность
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

    // Валидация и хеширование пароля
    if (req.body.password) {
      validatePassword(req.body.password);
      req.body.password = await bcrypt.hash(req.body.password, 12);
    }

    // Обновляем пользователя
    await user.update(req.body);

    // Получаем обновленного пользователя
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
  } catch(err) {
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
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении профиля: ' + err.message
    });
  }
};