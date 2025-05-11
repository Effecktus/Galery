const Ticket = require('../models/Ticket');
const Exhibition = require('../models/Exhibition');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Создание нового билета
exports.createTicket = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { exhibition_id, quantity } = req.body;
    
    // Проверяем доступность выставки
    const exhibition = await Exhibition.findByPk(exhibition_id, { transaction });
    if (!exhibition) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }

    // Проверяем статус выставки
    if (exhibition.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя купить билет на неактивную выставку'
      });
    }

    // Проверяем дату выставки
    if (new Date(exhibition.start_date) < new Date()) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя купить билет на прошедшую выставку'
      });
    }

    // Проверяем наличие билетов
    if (exhibition.remaining_tickets < quantity) {
      await transaction.rollback();
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

    res.status(201).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

// Получение всех билетов (только для админов)
exports.getAllTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
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

    const where = {
      user_id: req.user.id
    };

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

    // Проверяем, принадлежит ли билет пользователю
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Нет доступа к этому билету'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Отмена билета
exports.cancelTicket = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const ticket = await Ticket.findByPk(req.params.id, { transaction });

    if (!ticket) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }

    // Проверяем, принадлежит ли билет пользователю
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        status: 'error',
        message: 'Нет доступа к этому билету'
      });
    }

    // Проверяем, можно ли отменить билет (например, не позже чем за 24 часа)
    const bookingDate = new Date(ticket.booking_date);
    const now = new Date();
    const hoursSinceBooking = (now - bookingDate) / (1000 * 60 * 60);

    if (hoursSinceBooking > 24) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Билет можно отменить только в течение 24 часов после бронирования'
      });
    }

    // Возвращаем билеты в общее количество
    const exhibition = await Exhibition.findByPk(ticket.exhibition_id, { transaction });
    await exhibition.update({
      remaining_tickets: exhibition.remaining_tickets + ticket.quantity
    }, { transaction });

    // Удаляем билет
    await ticket.destroy({ transaction });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Билет успешно отменен'
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
}; 