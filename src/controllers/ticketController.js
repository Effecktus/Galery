const { Ticket, Exhibition, User } = require('../models');
const { Op, ValidationError } = require('sequelize');
const sequelize = require('../models').sequelize;

// Создание нового билета
exports.createTicket = async (req, res) => {
  let transaction;
  
  try {
    const { exhibition_id, quantity } = req.body;
    
    // Валидация входных данных
    if (!exhibition_id || !quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо указать exhibition_id и quantity'
      });
    }

    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Количество билетов должно быть положительным числом'
      });
    }

    // Проверяем существование выставки
    const exhibition = await Exhibition.findByPk(exhibition_id);
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка с указанным ID не найдена'
      });
    }

    // Проверяем количество оставшихся билетов
    if (exhibition.remaining_tickets < quantityNum) {
      return res.status(400).json({
        status: 'error',
        message: `Недостаточно билетов. Доступно: ${exhibition.remaining_tickets}`
      });
    }

    transaction = await sequelize.transaction();

    // Создаем билет
    const ticket = await Ticket.create({
      exhibition_id: req.body.exhibition_id,
      user_id: req.user.id,
      quantity: req.body.quantity
    }, { transaction });

    // Уменьшаем количество оставшихся билетов
    await exhibition.update({
      remaining_tickets: exhibition.remaining_tickets - quantityNum
    }, { transaction });

    await transaction.commit();

    // Получаем созданный билет с информацией о выставке
    const ticketData = await Ticket.findByPk(ticket.id, {
      include: [{
        model: Exhibition,
        attributes: ['id', 'title', 'start_date', 'end_date', 'location', 'ticket_price']
      }]
    });

    res.status(201).json({
      status: 'success',
      message: 'Билет успешно создан',
      data: {
        ticket: ticketData
      }
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    
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

    return res.status(500).json({
      status: 'error',
      message: 'Ошибка при создании билета: ' + err.message
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
        message: 'Доступ запрещен. Требуются права администратора'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};

    // Фильтрация по ID выставки
    if (req.query.exhibition_id) {
      const exhibitionId = parseInt(req.query.exhibition_id, 10);
      if (isNaN(exhibitionId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный ID выставки'
        });
      }
      where.exhibition_id = exhibitionId;
    }

    // Фильтрация по ID пользователя
    if (req.query.user_id) {
      const userId = parseInt(req.query.user_id, 10);
      if (isNaN(userId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный ID пользователя'
        });
      }
      where.user_id = userId;
    }

    // Фильтрация по дате бронирования
    if (req.query.booking_after) {
      where.booking_date = {
        ...where.booking_date,
        [Op.gte]: new Date(req.query.booking_after)
      };
    }
    if (req.query.booking_before) {
      where.booking_date = {
        ...where.booking_date,
        [Op.lte]: new Date(req.query.booking_before)
      };
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      limit,
      offset,
      order: [['booking_date', 'DESC']],
      include: [{
        model: Exhibition,
        attributes: ['id', 'title', 'start_date', 'end_date', 'location', 'status']
      }, {
        model: User,
        attributes: ['id', 'email', 'first_name', 'surname']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        tickets,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
          limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении списка билетов: ' + error.message
    });
  }
};

// Получение билетов текущего пользователя
exports.getMyTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.id };

    // Фильтрация по ID выставки
    if (req.query.exhibition_id) {
      const exhibitionId = parseInt(req.query.exhibition_id, 10);
      if (isNaN(exhibitionId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный ID выставки'
        });
      }
      where.exhibition_id = exhibitionId;
    }

    // Фильтрация по дате бронирования
    if (req.query.booking_date) {
      const bookingDate = new Date(req.query.booking_date);
      if (isNaN(bookingDate.getTime())) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная дата бронирования'
        });
      }
      where.booking_date = {
        [Op.between]: [
          bookingDate,
          new Date(bookingDate.setHours(23, 59, 59))
        ]
      };
    }

    // Фильтрация по дате посещения
    if (req.query.visit_date) {
      const visitDate = new Date(req.query.visit_date);
      if (isNaN(visitDate.getTime())) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная дата посещения'
        });
      }
      where.visit_date = {
        [Op.between]: [
          visitDate,
          new Date(visitDate.setHours(23, 59, 59))
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
        attributes: ['id', 'title', 'location', 'start_date', 'end_date', 'status', 'ticket_price']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        tickets,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
          limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении списка билетов: ' + error.message
    });
  }
};

// Получение информации о конкретном билете
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{
        model: Exhibition,
        attributes: ['id', 'title', 'start_date', 'end_date', 'location', 'status', 'ticket_price']
      }, {
        model: User,
        attributes: ['id', 'email', 'first_name', 'surname']
      }]
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }

    // Проверяем права доступа
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Нет прав для просмотра этого билета'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации о билете: ' + error.message
    });
  }
};

// Отметка о использовании билета (только для админов)
exports.useTicket = async (req, res) => {
  try {
    // Проверяем права доступа
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещен. Требуются права администратора'
      });
    }

    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{
        model: Exhibition,
        attributes: ['id', 'start_date', 'end_date', 'status']
      }]
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Билет с указанным ID не найден'
      });
    }

    // Проверяем статус выставки
    if (ticket.Exhibition.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя использовать билет на неактивную выставку'
      });
    }

    // Проверяем дату посещения
    const now = new Date();
    const startDate = new Date(ticket.Exhibition.start_date);
    const endDate = new Date(ticket.Exhibition.end_date);

    if (now < startDate || now > endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Билет можно использовать только в период проведения выставки'
      });
    }

    // Обновляем статус билета
    await ticket.update({
      status: 'used',
      use_date: new Date()
    });

    // Получаем обновленный билет
    const updatedTicket = await Ticket.findByPk(ticket.id, {
      include: [{
        model: Exhibition,
        attributes: ['id', 'title', 'location', 'start_date', 'end_date', 'status', 'ticket_price']
      }, {
        model: User,
        attributes: ['id', 'email', 'surname', 'first_name', 'patronymic']
      }]
    });

    res.status(200).json({
      status: 'success',
      message: 'Билет успешно отмечен как использованный',
      data: {
        ticket: updatedTicket
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при отметке использования билета: ' + error.message
    });
  }
};