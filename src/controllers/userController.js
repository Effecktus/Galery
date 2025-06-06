const { User, Ticket, Exhibition } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Функция для фильтрации чувствительных данных
const filterSensitiveData = (user) => {
  const { password, ...userWithoutSensitiveData } = user.toJSON();
  return userWithoutSensitiveData;
};

// Создание нового пользователя (админская операция)
exports.createUser = async (req, res) => {
  try {
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

    if(req.query.name) {
      where[Op.or] = [
        {email : { [Op.like]: `%${req.query.email}%` }},
        { surname: { [Op.like]: `%${req.query.name}%` } },
        { first_name: { [Op.like]: `%${req.query.name}%` } },
        { patronymic: { [Op.like]: `%${req.query.name}%` } },
        { role : { [Op.like]: `%${req.query.name}%` }}
      ];
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
        ...userData,
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
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении профиля'
    });
  }
};