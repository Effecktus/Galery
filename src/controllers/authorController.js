const { Author } = require('../models');
const { Artwork } = require('../models');
const { Op, ValidationError } = require('sequelize');
const sequelize = require('sequelize');

// Создание нового автора
exports.createAuthor = async (req, res) => {
  try {
    const newAuthor = await Author.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        author: newAuthor
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
      message: 'Не удалось создать автора: ' + err.message
    });
  }
};

// Получение всех авторов
exports.getAllAuthors = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // Базовые условия фильтрации
    const where = {};
    if (req.query.surname) {
      where.surname = { [Op.like]: `%${req.query.surname}%` };
    }
    if (req.query.first_name) {
      where.first_name = { [Op.like]: `%${req.query.first_name}%` };
    }
    if (req.query.patronymic) {
      where.patronymic = { [Op.like]: `%${req.query.patronymic}%` };
    }

    // Фильтрация по датам
    if (req.query.birth_year) {
      const year = parseInt(req.query.birth_year, 10);
      if (isNaN(year)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный год рождения'
        });
      }
      where.date_of_birth = {
        [Op.between]: [
          new Date(year, 0, 1),
          new Date(year, 11, 31)
        ]
      };
    }
    if (req.query.death_year) {
      const year = parseInt(req.query.death_year, 10);
      if (isNaN(year)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный год смерти'
        });
      }
      where.date_of_death = {
        [Op.between]: [
          new Date(year, 0, 1),
          new Date(year, 11, 31)
        ]
      };
    }

    const { count, rows: authors } = await Author.findAndCountAll({
      where,
      limit,
      offset,
      order: [['surname', 'ASC'], ['first_name', 'ASC']],
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        authors,
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
            model: Style, // Заменено с sequelize.models.Style
            attributes: ['name']
          },
          {
            model: Genre, // Заменено с sequelize.models.Genre
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
        author
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

    const [updated] = await Author.update(req.body, {
      where: { id: req.params.id }
    });

    const updatedAuthor = await Author.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        author: updatedAuthor
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
    // Проверяем, есть ли у автора произведения
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

    if (author.Artworks && author.Artworks.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить автора, у которого есть произведения'
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