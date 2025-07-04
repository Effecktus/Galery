const { Author, Artwork, Style, Genre } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Создание нового автора
exports.createAuthor = async (req, res) => {
  try {
    const newAuthor = await Author.create(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Автор успешно создан',
      data: { author: normalizePatronymic(newAuthor) }
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
      message: 'Не удалось создать автора: ' + err.message
    });    
  }
};

// Получение всех авторов
exports.getAllAuthors = async (req, res) => {
  try {
    const where = {};
    if (req.query.name) {
      const searchTerms = req.query.name.toLowerCase().split(' ').filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        where[Op.and] = searchTerms.map(term => ({
          [Op.or]: [
            { surname: { [Op.like]: `%${term}%` } },
            { first_name: { [Op.like]: `%${term}%` } },
            { patronymic: { [Op.like]: `%${term}%` } }
          ]
        }));
      }
    }

    // Фильтрация по периоду жизни
    if (req.query.date_from || req.query.date_to) {
      const dateConditions = [];
      
      if (req.query.date_from && req.query.date_to) {
        // Если указаны обе даты, проверяем пересечение периодов
        // Автор попадает в фильтр, если его период жизни пересекается с выбранным диапазоном
        // Это означает: дата рождения <= date_to И дата смерти >= date_from
        dateConditions.push({
          [Op.and]: [
            { date_of_birth: { [Op.lte]: req.query.date_to } },
            { date_of_death: { [Op.gte]: req.query.date_from } }
          ]
        });
      } else if (req.query.date_from) {
        // Если указана только начальная дата, автор должен был жить после неё
        dateConditions.push({
          date_of_death: { [Op.gte]: req.query.date_from }
        });
      } else if (req.query.date_to) {
        // Если указана только конечная дата, автор должен был родиться до неё
        dateConditions.push({
          date_of_birth: { [Op.lte]: req.query.date_to }
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

    const authors = await Author.findAll({
      where,
      include: [{
        model: Artwork,
        attributes: ['id', 'title'],
        required: false
      }],
      distinct: true
    });

    // Добавляем статистику по произведениям
    const authorsWithStats = authors.map(author => ({
      ...normalizePatronymic(author.toJSON()),
      statistics: {
        total_artworks: author.Artworks ? author.Artworks.length : 0
      }
    }));

    res.status(200).json({
      status: 'success',
      data: {
        authors: authorsWithStats
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении списка авторов: ' + err.message
    });
  }
};

// Получение автора по ID
exports.getAuthor = async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path', 'style_id', 'genre_id'],
        include: [
          {
            model: Style,
            attributes: ['name']
          },
          {
            model: Genre,
            attributes: ['name']
          }
        ]
      }]
    });
    
    if (!author) {
      return res.status(404).json({
        status: 'error',
        message: 'Автор с указанным ID не найден'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        author: normalizePatronymic(author)
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации об авторе: ' + err.message
    });
  }
};

// Обновление автора по ID
exports.updateAuthor = async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    
    if (!author) {
      return res.status(404).json({
        status: 'error',
        message: 'Автор с указанным ID не найден'
      });
    }

    // Проверяем, не пытаемся ли мы изменить дату смерти на дату раньше даты рождения
    if (req.body.date_of_death && author.date_of_birth) {
      const newDeathDate = new Date(req.body.date_of_death);
      const birthDate = new Date(author.date_of_birth);
      if (newDeathDate <= birthDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Дата смерти должна быть позже даты рождения'
        });
      }
    }

    // Обновляем автора
    await author.update(req.body);

    // Получаем обновленного автора
    const updatedAuthor = await Author.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        author: normalizePatronymic(updatedAuthor)
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
      message: 'Ошибка при обновлении автора: ' + err.message
    });
  }
};

// Удаление автора по ID
exports.deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id']
      }]
    });

    if (!author) {
      return res.status(404).json({
        status: 'error',
        message: 'Автор с указанным ID не найден'
      });
    }

    // Проверяем, есть ли у автора произведения
    if (author.Artworks && author.Artworks.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить автора, у которого есть произведения',
        data: {
          artworksCount: author.Artworks.length
        }
      });
    }

    await author.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Автор успешно удален',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении автора: ' + err.message
    });
  }
};

// Утилита для замены null в patronymic на пустую строку
const normalizePatronymic = (obj, seen = new WeakSet()) => {
  if (obj && typeof obj === 'object') {
    if (seen.has(obj)) return obj;   // остановка на уже встреченном
    seen.add(obj);
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = normalizePatronymic(obj[key], seen);
      }
    }
  }
  return obj;
};