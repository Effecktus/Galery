const { User, Ticket, Exhibition } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Функция для фильтрации чувствительных данных
const filterSensitiveData = (user) => {
  const { password, ...userWithoutSensitiveData } = user.toJSON();
  return userWithoutSensitiveData;
};

// Утилита для замены null в patronymic на пустую строку
const normalizePatronymic = (obj) => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(normalizePatronymic);
  }
  if (typeof obj === 'object') {
    if ('patronymic' in obj && obj.patronymic === null) {
      obj.patronymic = '';
    }
    // Рекурсивно для вложенных объектов (например, Tickets)
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = normalizePatronymic(obj[key]);
      }
    }
  }
  return obj;
};

// Создание нового пользователя (админская операция)
exports.createUser = async (req, res) => {
  try {
    // Преобразуем пустую строку patronymic в null
    if (req.body.patronymic === '') req.body.patronymic = null;
    const newUser = await User.create(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Пользователь успешно создан',
      data: {
        user: normalizePatronymic(filterSensitiveData(newUser))
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
    res.status(500).json({
      status: 'error',
      message: 'Не удалось создать пользователя'
    });
  }
};

// Получение всех пользователей
exports.getAllUsers = async (req, res) => {
  try {
    const where = {};

    if (req.query.name) {
      const searchWords = req.query.name.trim().split(/\s+/);
      where[Op.and] = searchWords.map(word => ({
        [Op.or]: [
          { surname: { [Op.like]: `%${word}%` } },
          { first_name: { [Op.like]: `%${word}%` } },
          { patronymic: { [Op.like]: `%${word}%` } },
          { email: { [Op.like]: `%${word}%` } },
          { role: { [Op.like]: `%${word}%` } }
        ]
      }));
    }

    const users = await User.findAll({
      where,
      include: [{
        model: Ticket,
        attributes: ['id'],
        required: false
      }],
      distint: true
    });

    const usersWithStats = users.map(user => {
      const userData = filterSensitiveData(user);
      return {
        ...normalizePatronymic(userData),
        statistics: {
          total_tickets: user.Tickets ? user.Tickets.length : 0
        }
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        users: usersWithStats
      }
    });
  } catch (err) {
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
      ...normalizePatronymic(filterSensitiveData(user)),
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

    // Проверка email
    if (req.body.email && req.body.email !== user.email) {
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

    // Преобразуем пустую строку patronymic в null
    if (req.body.patronymic === '') req.body.patronymic = null;

    // Обновляем пользователя
    await user.update(req.body);

    // Получение обновлённого пользователя
    const updatedUser = await User.findByPk(req.params.id, {
      include: [{
        model: Ticket,
        attributes: ['id']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: normalizePatronymic(filterSensitiveData(updatedUser))
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

    if (user.Tickets && user.Tickets.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить пользователя с забронированными билетами',
        data: {
          ticketCount: user.Tickets.length
        }
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

    // Проверка email
    if (req.body.email && req.body.email !== user.email) {
      
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
        user: normalizePatronymic(filterSensitiveData(updatedUser))
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
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении профиля'
    });
  }
};

// Получение профиля текущего пользователя
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        user: normalizePatronymic(filterSensitiveData(user))
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении профиля'
    });
  }
};