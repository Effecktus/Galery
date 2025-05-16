const Ticket = require('../models/Ticket');
const Exhibition = require('../models/Exhibition');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Создание нового билета
exports.createTicket = async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    const { exhibition_id, quantity } = req.body;
    
    if (!exhibition_id || !quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо указать exhibition_id и quantity'
      });
    }

    // Проверяем доступность выставки
    const exhibition = await Exhibition.findByPk(exhibition_id, { transaction });
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }

    // Проверяем статус выставки
    if (exhibition.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя купить билет на неактивную выставку'
      });
    }

    // Проверяем дату выставки
    const now = new Date();
    if (new Date(exhibition.end_date) < now) {
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя купить билет на прошедшую выставку'
      });
    }

    // Проверяем наличие билетов
    if (exhibition.remaining_tickets < quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Недостаточно билетов'
      });
    }

    // Создаем билет
    const ticket = await Ticket.create({
      user_id: req.user.id,
      exhibition_id,
      quantity,
      total_price: exhibition.ticket_price * quantity,
      booking_date: new Date()
    }, { transaction });

    // Уменьшаем количество оставшихся билетов
    await exhibition.update({
      remaining_tickets: exhibition.remaining_tickets - quantity
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Получение всех билетов (только для админов)
exports.getAllTickets = async (req, res) => {
  try {
    // Проверяем роль пользователя
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещен'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.exhibition_id) {
      where.exhibition_id = req.query.exhibition_id;
    }
    if (req.query.booking_date) {
      where.booking_date = {
        [Op.between]: [
          new Date(req.query.booking_date),
          new Date(new Date(req.query.booking_date).setHours(23, 59, 59))
        ]
      };
    }
    if (req.query.min_price) {
      where.total_price = {
        [Op.gte]: parseFloat(req.query.min_price)
      };
    }
    if (req.query.max_price) {
      where.total_price = {
        ...where.total_price,
        [Op.lte]: parseFloat(req.query.max_price)
      };
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      limit,
      offset,
      order: [['booking_date', 'DESC']],
      include: [{
        model: Exhibition,
        attributes: ['title', 'location', 'start_date', 'end_date']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        tickets,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билетов',
      error: error.message
    });
  }
};

// Получение всех билетов пользователя
exports.getUserTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    
    // Если пользователь не админ, показываем только его билеты
    if (req.user.role !== 'admin') {
      where.user_id = req.user.id;
    }

    if (req.query.exhibition_id) {
      where.exhibition_id = req.query.exhibition_id;
    }

    if (req.query.booking_date) {
      where.booking_date = {
        [Op.between]: [
          new Date(req.query.booking_date),
          new Date(new Date(req.query.booking_date).setHours(23, 59, 59))
        ]
      };
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      limit,
      offset,
      order: [['booking_date', 'DESC']],
      include: [{
        model: Exhibition,
        attributes: ['title', 'location', 'start_date', 'end_date', 'status']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        tickets,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билетов',
      error: error.message
    });
  }
};

// Получение информации о конкретном билете
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{
        model: Exhibition,
        attributes: ['title', 'location', 'start_date', 'end_date', 'status']
      }]
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }

    // Проверяем права доступа (только владелец или админ)
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      console.log(`Доступ запрещен: user_id=${ticket.user_id}, req.user.id=${req.user.id}, role=${req.user.role}`);
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещен'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (error) {
    console.error('Ошибка при получении билета:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билета',
      error: error.message
    });
  }
};

// Отмена билета
exports.cancelTicket = async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    const ticket = await Ticket.findByPk(req.params.id, { transaction });
    
    if (!ticket) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }

    // Проверяем права доступа (только владелец или админ)
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещен'
      });
    }

    // Получаем информацию о выставке
    const exhibition = await Exhibition.findByPk(ticket.exhibition_id, { transaction });
    
    if (!exhibition) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }

    // Проверяем статус выставки
    if (exhibition.status === 'completed') {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя отменить билет на завершенную выставку'
      });
    }

    // Обновляем количество билетов напрямую в базе данных, чтобы пропустить валидацию модели
    await sequelize.query(
      'UPDATE Exhibitions SET remaining_tickets = remaining_tickets + ? WHERE id = ?',
      {
        replacements: [ticket.quantity, exhibition.id],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    // Удаляем билет
    await ticket.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      status: 'success',
      message: 'Билет успешно отменен'
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Ошибка при отмене билета:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Ошибка при отмене билета',
      error: error.message
    });
  }
};