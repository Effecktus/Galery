// Предполагаемый код, адаптированный под изменения
const { Ticket, Exhibition, User } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Создание билета
exports.createTicket = async (req, res) => {
  try {
    const { exhibition_id, quantity } = req.body;
    if (!exhibition_id || !quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо указать выставку и количество билетов'
      });
    }
    const exhibition = await Exhibition.findByPk(exhibition_id);
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }
    if (exhibition.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Выставка недоступна для покупки билетов'
      });
    }
    if (exhibition.remaining_tickets < quantity) {
      return res.status(400).json({
        status: 'error',
        message: 'Недостаточно билетов'
      });
    }
    const total_price = exhibition.ticket_price * quantity;
    const ticket = await Ticket.create({
      user_id: req.user.id,
      exhibition_id,
      quantity,
      booking_date: new Date(),
      total_price
    });
    await exhibition.update({
      remaining_tickets: exhibition.remaining_tickets - quantity
    });
    res.status(201).json({
      status: 'success',
      data: { ticket }
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
      message: 'Ошибка при создании билета: ' + err.message
    });
  }
};

// Получение всех билетов
exports.getAllTickets = async (req, res) => {
  try {
    const where = {};
    
    // Поиск по тексту
    if (req.query.search) {
      const searchWords = req.query.search.trim().split(/\s+/);
      where[Op.and] = searchWords.map(word => ({
        [Op.or]: [
          { id: { [Op.like]: `%${word}%` } },
          { user_id: { [Op.like]: `%${word}%` } },
          { exhibition_id: { [Op.like]: `%${word}%` } },
          { quantity: { [Op.like]: `%${word}%` } },
          { total_price: { [Op.like]: `%${word}%` } },
          { booking_date: { [Op.like]: `%${word}%` } },
          { '$User.surname$': { [Op.like]: `%${word}%` } },
          { '$User.first_name$': { [Op.like]: `%${word}%` } },
          { '$User.patronymic$': { [Op.like]: `%${word}%` } },
          { '$Exhibition.title$': { [Op.like]: `%${word}%` } }
        ]
      }));
    }

    // Фильтрация по дате бронирования
    if (req.query.booking_date_from || req.query.booking_date_to) {
      const dateConditions = [];
      
      if (req.query.booking_date_from && req.query.booking_date_to) {
        // Если указаны обе даты, проверяем диапазон
        dateConditions.push({
          [Op.and]: [
            { booking_date: { [Op.gte]: req.query.booking_date_from } },
            { booking_date: { [Op.lte]: req.query.booking_date_to + ' 23:59:59' } }
          ]
        });
      } else if (req.query.booking_date_from) {
        // Если указана только начальная дата
        dateConditions.push({
          booking_date: { [Op.gte]: req.query.booking_date_from }
        });
      } else if (req.query.booking_date_to) {
        // Если указана только конечная дата
        dateConditions.push({
          booking_date: { [Op.lte]: req.query.booking_date_to + ' 23:59:59' }
        });
      }
      
      if (dateConditions.length > 0) {
        if (where[Op.and]) {
          where[Op.and].push({ [Op.and]: dateConditions });
        } else {
          where[Op.and] = dateConditions;
        }
      }
    }

    // Фильтрация по цене
    if (req.query.min_price || req.query.max_price) {
      const priceConditions = [];
      
      if (req.query.min_price) {
        const minPrice = parseFloat(req.query.min_price);
        if (!isNaN(minPrice) && minPrice >= 0) {
          priceConditions.push({ total_price: { [Op.gte]: minPrice } });
        }
      }
      
      if (req.query.max_price) {
        const maxPrice = parseFloat(req.query.max_price);
        if (!isNaN(maxPrice) && maxPrice >= 0) {
          priceConditions.push({ total_price: { [Op.lte]: maxPrice } });
        }
      }
      
      if (priceConditions.length > 0) {
        if (where[Op.and]) {
          where[Op.and].push({ [Op.and]: priceConditions });
        } else {
          where[Op.and] = priceConditions;
        }
      }
    }

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: User, attributes: ['id', 'surname', 'first_name', 'patronymic'], required: false },
        { model: Exhibition, attributes: ['id', 'title'], required: false }
      ],
      order: [['booking_date', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: { tickets }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билетов: ' + err.message
    });
  }
};

// Рендер страницы покупок пользователя
exports.renderUserTickets = async (req, res, next) => {
  try {
    const userId = res.locals.user.id;
    const tickets = await Ticket.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Exhibition,
          attributes: ['id', 'title', 'start_date', 'end_date', 'location']
        }
      ],
      order: [['booking_date', 'DESC']]
    });

    res.render('tickets', {
      title: 'Мои билеты',
      user: res.locals.user,
      tickets
    });
  } catch (err) {
    next(err);
  }
};

// Получение билетов текущего пользователя
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Exhibition, attributes: ['id', 'title', 'start_date', 'end_date', 'location'] }]
    });
    res.status(200).json({
      status: 'success',
      data: { tickets }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билетов: ' + err.message
    });
  }
};

// Получение билета по ID
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{ model: Exhibition, attributes: ['id', 'title', 'start_date', 'end_date'] }]
    });
    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещён'
      });
    }
    res.status(200).json({
      status: 'success',
      data: { ticket }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении билета: ' + err.message
    });
  }
};

// Отмена (удаление) билета
exports.cancelTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Билет не найден'
      });
    }
    if (ticket.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Доступ запрещён'
      });
    }
    const exhibition = await Exhibition.findByPk(ticket.exhibition_id);
    if (exhibition) {
      await exhibition.update({
        remaining_tickets: exhibition.remaining_tickets + ticket.quantity
      });
    }
    await ticket.destroy();
    res.status(200).json({
      status: 'success',
      message: 'Билет успешно отменён',
      data: null
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при отмене билета: ' + err.message
    });
  }
};