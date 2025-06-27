const { Exhibition, Artwork, Ticket, Author, Style, Genre } = require('../models');
const { Op, ValidationError, Sequelize } = require('sequelize');

// Создание новой выставки
exports.createExhibition = async (req, res) => {
  try {

    const data = { ...req.body };
    data.remaining_tickets = data.total_tickets;
    if (req.file) data.poster_path = '/media/' + req.file.filename;

    const exhibition = await Exhibition.create(data);

    let artworkIds = req.body.artwork_ids || req.body['artwork_ids[]'];
    if (artworkIds) {
      if (typeof artworkIds === 'string') {
        try {
          artworkIds = JSON.parse(artworkIds);
        } catch {
          artworkIds = artworkIds.split(',').map(id => id.trim());
        }
      }
      if (Array.isArray(artworkIds)) {
        // приводим к числам
        const ids = artworkIds.map(i => parseInt(i, 10)).filter(i => !isNaN(i));
        await exhibition.setArtworks(ids);
      }
    }

    // возвращаем только что созданную с привязанными картинами
    const exhibitionData = await Exhibition.findByPk(exhibition.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });

    return res.status(201).json({
      status: 'success',
      data: { exhibition: exhibitionData }
    });
  }  catch(err) {
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
    const where = {};

    // Фильтрация по статусу (поддержка множественного выбора)
    if (req.query.status) {
      const statuses = Array.isArray(req.query.status) ? req.query.status : [req.query.status];
      const validStatuses = statuses.filter(status => ['upcoming', 'active', 'completed'].includes(status));

      if (validStatuses.length > 0) {
        where.status = { [Op.in]: validStatuses };
      }
    }

    // Фильтрация по месту проведения
    if (req.query.location) {
      where.location = { [Op.like]: `%${req.query.location}%` };
    }

    // Фильтрация по названию
    if (req.query.title) {
      where.title = { [Op.like]: `%${req.query.title}%` };
    }

    // Фильтрация по периоду проведения
    if (req.query.start_date || req.query.end_date) {
      const dateConditions = [];

      if (req.query.start_date && req.query.end_date) {
        // Если указаны обе даты, проверяем пересечение периодов
        // Выставка попадает в фильтр, если её период пересекается с выбранным диапазоном
        dateConditions.push({
          [Op.and]: [
            { start_date: { [Op.lte]: req.query.end_date } },
            { end_date: { [Op.gte]: req.query.start_date } }
          ]
        });
      } else if (req.query.start_date) {
        // Если указана только начальная дата, выставка должна начаться после неё
        dateConditions.push({
          start_date: { [Op.gte]: req.query.start_date }
        });
      } else if (req.query.end_date) {
        // Если указана только конечная дата, выставка должна закончиться до неё
        dateConditions.push({
          end_date: { [Op.lte]: req.query.end_date }
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

    // Фильтрация по цене билета
    if (req.query.min_price || req.query.max_price) {
      const priceConditions = [];

      if (req.query.min_price) {
        const minPrice = parseFloat(req.query.min_price);
        if (!isNaN(minPrice) && minPrice >= 0) {
          priceConditions.push({ ticket_price: { [Op.gte]: minPrice } });
        }
      }

      if (req.query.max_price) {
        const maxPrice = parseFloat(req.query.max_price);
        if (!isNaN(maxPrice) && maxPrice >= 0) {
          priceConditions.push({ ticket_price: { [Op.lte]: maxPrice } });
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

    // Многословный поиск по всем основным полям
    if (req.query.search) {
      const searchWords = req.query.search.trim().split(/\s+/);
      const searchConditions = searchWords.map(word => ({
        [Op.or]: [
          { title: { [Op.like]: `%${word}%` } },
          { location: { [Op.like]: `%${word}%` } },
          { status: { [Op.like]: `%${word}%` } },
          { description: { [Op.like]: `%${word}%` } }
        ]
      }));

      if (where[Op.and]) {
        where[Op.and].push(...searchConditions);
      } else {
        where[Op.and] = searchConditions;
      }
    }

    const exhibitions = await Exhibition.findAll({
      where,
      order: [['start_date', 'ASC']],
      include: [
        {
          model: Artwork,
          attributes: ['id', 'title', 'creation_year', 'image_path'],
          include: [
            {
              model: Author,
              attributes: ['id', 'surname', 'first_name', 'patronymic']
            }
          ]
        },
        {
          model: Ticket,
          attributes: ['id', 'quantity']
        }
      ]
    });

    // Нормализуем patronymic у всех авторов
    exhibitions.forEach(exh => {
      if (exh.Artworks) {
        exh.Artworks.forEach(art => {
          if (art.Author) normalizePatronymic(art.Author);
        });
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        exhibitions
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

    // Нормализуем patronymic у всех авторов
    if (exhibition && exhibition.Artworks) {
      exhibition.Artworks.forEach(art => {
        if (art.Author) normalizePatronymic(art.Author);
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
      return res.status(404).json({ status: 'error', message: 'Выставка не найдена' });
    }

    // … ваши валидации …

    const updateData = { ...req.body };
    if (req.body.total_tickets !== undefined) {
      updateData.remaining_tickets = req.body.total_tickets;
    }
    if (req.file) {
      updateData.poster_path = '/media/' + req.file.filename;
    }
    await exhibition.update(updateData);

    // --- НОВОЕ: обрабатываем artwork_ids так же, как в create ---
    let artworkIds = req.body.artwork_ids || req.body['artwork_ids[]'];
    if (artworkIds) {
      if (typeof artworkIds === 'string') {
        try {
          artworkIds = JSON.parse(artworkIds);
        } catch {
          artworkIds = artworkIds.split(',').map(id => id.trim());
        }
      }
      if (Array.isArray(artworkIds)) {
        const ids = artworkIds.map(i => parseInt(i, 10)).filter(i => !isNaN(i));
        await exhibition.setArtworks(ids);
      }
    }

    const updated = await Exhibition.findByPk(req.params.id, {
      include: [{ model: Artwork, attributes: ['id', 'title', 'creation_year', 'image_path'] }]
    });

    return res.status(200).json({
      status: 'success',
      data: { exhibition: updated }
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
  return res.status(400).json({
    status: 'error',
    message: 'Статус выставки определяется автоматически по датам начала и окончания. Ручное изменение невозможно.'
  });
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

    // Удаляем все связи с картинами (junction-таблица exhibition_artwork)
    await exhibition.setArtworks([]);

    // Теперь можно удалить саму выставку
    await exhibition.destroy();

    return res.status(200).json({
      status: 'success',
      message: 'Выставка и связанные записи успешно удалены',
      data: null
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении выставки: ' + err.message
    });
  }
};

exports.renderExhibitionsPage = (req, res) => {
  res.render('exhibitions', {
    title: 'Выставки',
    user: res.locals.user || null
  });
};

// Получение только активных и предстоящих выставок для главной страницы
exports.getPublicExhibitions = async (req, res) => {
  try {
    const where = {
      status: { [Op.in]: ['active', 'upcoming'] }
    };

    // Фильтрация по дате проведения
    if (req.query.start_date || req.query.end_date) {
      const dateConditions = [];
      if (req.query.start_date && req.query.end_date) {
        dateConditions.push({
          [Op.and]: [
            { start_date: { [Op.lte]: req.query.end_date } },
            { end_date: { [Op.gte]: req.query.start_date } }
          ]
        });
      } else if (req.query.start_date) {
        dateConditions.push({ start_date: { [Op.gte]: req.query.start_date } });
      } else if (req.query.end_date) {
        dateConditions.push({ end_date: { [Op.lte]: req.query.end_date } });
      }
      if (dateConditions.length > 0) {
        if (where[Op.and]) {
          where[Op.and].push({ [Op.and]: dateConditions });
        } else {
          where[Op.and] = dateConditions;
        }
      }
    }

    // Фильтрация по цене билета
    if (req.query.min_price || req.query.max_price) {
      const priceConditions = [];
      if (req.query.min_price) {
        const minPrice = parseFloat(req.query.min_price);
        if (!isNaN(minPrice) && minPrice >= 0) {
          priceConditions.push({ ticket_price: { [Op.gte]: minPrice } });
        }
      }
      if (req.query.max_price) {
        const maxPrice = parseFloat(req.query.max_price);
        if (!isNaN(maxPrice) && maxPrice >= 0) {
          priceConditions.push({ ticket_price: { [Op.lte]: maxPrice } });
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

    // Поиск по названию и месту проведения
    if (req.query.search) {
      const searchWords = req.query.search.trim().split(/\s+/);
      const searchConditions = searchWords.map(word => ({
        [Op.or]: [
          { title: { [Op.like]: `%${word}%` } },
          { location: { [Op.like]: `%${word}%` } }
        ]
      }));
      if (where[Op.and]) {
        where[Op.and].push(...searchConditions);
      } else {
        where[Op.and] = searchConditions;
      }
    }

    // Получаем выставки
    let exhibitions = await Exhibition.findAll({
      where,
      order: [
        // Сначала активные, потом предстоящие, внутри — по дате начала
        [Sequelize.literal(`CASE WHEN status = 'active' THEN 0 WHEN status = 'upcoming' THEN 1 ELSE 2 END`), 'ASC'],
        ['start_date', 'ASC']
      ],
      attributes: ['id', 'title', 'location', 'description', 'ticket_price', 'start_date', 'end_date', 'status', 'poster_path']
    });

    // Нормализуем patronymic у всех авторов
    exhibitions.forEach(exh => {
      if (exh.Artworks) {
        exh.Artworks.forEach(art => {
          if (art.Author) normalizePatronymic(art.Author);
        });
      }
    });

    res.status(200).json({
      status: 'success',
      data: { exhibitions }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении выставок: ' + err.message
    });
  }
};

// Рендер подробной страницы выставки
exports.renderExhibitionPage = async (req, res) => {
  try {
    const exhibition = await Exhibition.findByPk(req.params.id, {
      include: [
        {
          model: Artwork,
          attributes: ['id', 'title', 'image_path'],
          include: [{
            model: Author,
            attributes: ['surname', 'first_name', 'patronymic']
          }]
        }
      ]
    });
    if (!exhibition) {
      return res.status(404).render('error', { message: 'Выставка не найдена' });
    }
    res.render('exhibition', {
      title: exhibition.title,
      exhibition: exhibition.toJSON(),
      user: res.locals.user || null
    });
  } catch (err) {
    res.status(500).render('error', { message: 'Ошибка при загрузке выставки: ' + err.message });
  }
};

// Вспомогательная функция для нормализации patronymic
function normalizePatronymic(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(normalizePatronymic);
  }
  if (typeof obj === 'object') {
    if ('patronymic' in obj && obj.patronymic === null) {
      obj.patronymic = '';
    }
    // Рекурсивно для вложенных объектов
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = normalizePatronymic(obj[key]);
      }
    }
  }
  return obj;
}