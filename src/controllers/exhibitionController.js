const { Exhibition, Artwork, Ticket, Author, Style, Genre } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Создание новой выставки
exports.createExhibition = async (req, res) => {
  try {
    // Проверяем корректность дат
    if (req.body.start_date && req.body.end_date) {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(req.body.end_date);
      
      if (startDate >= endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Дата начала выставки должна быть раньше даты окончания'
        });
      }
    }

    // Проверяем корректность цены билета
    if (req.body.ticket_price !== undefined) {
      const price = parseFloat(req.body.ticket_price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Цена билета должна быть положительным числом'
        });
      }
    }

    const exhibition = await Exhibition.create(req.body);

    const exhibitionData = await Exhibition.findByPk(exhibition.id, {
      include: [{ 
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });

    res.status(201).json({
      status: 'success',
      data: {
        exhibition: exhibitionData
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
      message: 'Не удалось создать выставку: ' + err.message
    });      
  }
};

// Получение всех выставок с фильтрацией и пагинацией
exports.getAllExhibitions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    
    if (req.query.status) {
      if (!['planned', 'active', 'completed'].includes(req.query.status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный статус выставки. Допустимые значения: planned, active, completed'
        });
      }
      where.status = req.query.status;
    }

    if (req.query.location) {
      where.location = { [Op.like]: `%${req.query.location}%` };
    }

    if (req.query.title) {
      where.title = { [Op.like]: `%${req.query.title}%` };
    }
    
    if (req.query.start_date) {
      const startDate = new Date(req.query.start_date);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная дата начала'
        });
      }
      where.start_date = { [Op.gte]: startDate };
    }
    if (req.query.end_date) {
      const endDate = new Date(req.query.end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная дата окончания'
        });
      }
      where.end_date = { [Op.lte]: endDate };
    }

    if (req.query.min_price) {
      const minPrice = parseFloat(req.query.min_price);
      if (isNaN(minPrice) || minPrice < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная минимальная цена'
        });
      }
      where.ticket_price = { ...where.ticket_price, [Op.gte]: minPrice };
    }
    if (req.query.max_price) {
      const maxPrice = parseFloat(req.query.max_price);
      if (isNaN(maxPrice) || maxPrice < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректная максимальная цена'
        });
      }
      if (where.ticket_price && where.ticket_price[Op.gte] && maxPrice < where.ticket_price[Op.gte]) {
        return res.status(400).json({
          status: 'error',
          message: 'Максимальная цена не может быть меньше минимальной'
        });
      }
      where.ticket_price = { ...where.ticket_price, [Op.lte]: maxPrice };
    }

    const { count, rows: exhibitions } = await Exhibition.findAndCountAll({
      where,
      limit,
      offset,
      order: [['start_date', 'ASC']],
      include: [{ 
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        exhibitions,
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
      message: 'Ошибка при получении списка выставок: ' + err.message
    });
  }
};

// Получение выставки по ID
exports.getExhibition = async (req, res) => {
  try {
    const exhibition = await Exhibition.findByPk(req.params.id, {
      include: [
        { 
          model: Artwork,
          attributes: ['id', 'title', 'creation_year', 'image_path', 'author_id', 'style_id', 'genre_id'],
          include: [
            {
              model: Author,
              attributes: ['id', 'surname', 'first_name', 'patronymic']
            },
            {
              model: Style,
              attributes: ['id', 'name']
            },
            {
              model: Genre,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: Ticket,
          attributes: ['id', 'quantity', 'booking_date', 'total_price']
        }
      ]
    });

    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка с указанным ID не найдена'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { 
        exhibition,
        statistics: {
          total_artworks: exhibition.Artworks.length,
          total_tickets: exhibition.Tickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
        }
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации о выставке: ' + err.message
    });
  }
};

// Обновление выставки по ID
exports.updateExhibition = async (req, res) => {
  try {
    const exhibition = await Exhibition.findByPk(req.params.id);
    
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка с указанным ID не найдена'
      });
    }

    if (req.body.start_date || req.body.end_date) {
      const startDate = new Date(req.body.start_date || exhibition.start_date);
      const endDate = new Date(req.body.end_date || exhibition.end_date);
      
      if (startDate >= endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Дата начала выставки должна быть раньше даты окончания'
        });
      }
    }

    if (req.body.ticket_price !== undefined) {
      const price = parseFloat(req.body.ticket_price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Цена билета должна быть положительным числом'
        });
      }
    }

    await exhibition.update(req.body);

    const updatedExhibition = await Exhibition.findByPk(req.params.id, {
      include: [{ 
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: { 
        exhibition: updatedExhibition
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
      message: 'Ошибка при обновлении выставки: ' + err.message
    });
  }
};

// Обновление статуса выставки
exports.updateExhibitionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['planned', 'active', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Некорректный статус выставки. Допустимые значения: planned, active, completed'
      });
    }

    const exhibition = await Exhibition.findByPk(req.params.id, {
      include: [{ model: Ticket }]
    });
    
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка с указанным ID не найдена'
      });
    }

    if (status === 'completed' && new Date(exhibition.end_date) > new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя завершить выставку до даты окончания'
      });
    }

    await exhibition.update({ status });

    const updatedExhibition = await Exhibition.findByPk(req.params.id, {
      include: [{ 
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: { 
        exhibition: updatedExhibition
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при обновлении статуса выставки: ' + err.message
    });
  }
};

// Удаление выставки по ID
exports.deleteExhibition = async (req, res) => {
  try {
    const exhibition = await Exhibition.findByPk(req.params.id, {
      include: [{ model: Ticket }]
    });
    
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка с указанным ID не найдена'
      });
    }

    if (exhibition.Tickets.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить выставку, на которую были забронированы билеты'
      });
    }

    await exhibition.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Выставка успешно удалена',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении выставки: ' + err.message
    });
  }
};