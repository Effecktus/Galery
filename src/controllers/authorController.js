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
const normalizePatronymic = (obj) => {
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
};