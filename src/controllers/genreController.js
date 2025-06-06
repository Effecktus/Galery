const { Genre, Artwork, Author, Style } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Создание нового жанра
exports.createGenre = async (req, res) => {
  try {
      const newGenre = await Genre.create(req.body);

      res.status(201).json({
          status: 'success',
          message: 'Жанр успешно создан',
          data: { genre: newGenre }
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
          message: 'Не удалось создать жанр: ' + err.message
      });
  }
};

// Получение всех жанров
exports.getAllGenres = async (req, res) => {
  try {
    // Фильтрация по названию
    const where = {};
    if (req.query.name) {
      where.name = { [Op.like]: `%${req.query.name}%` };
    }

    const genres = await Genre.findAll({
      where,
      include: [{
        model: Artwork,
        attributes: ['id', 'title'],
        required: req.query.has_artworks === 'true'
      }],
      distinct: true
    });

    // Добавляем статистику по произведениям
    const genresWithStats = genres.map(genre => ({
      ...genre.toJSON(),
      statistics: {
        total_artworks: genre.Artworks ? genre.Artworks.length : 0
      }
    }));

    res.status(200).json({
      status: 'success',
      data: {
        genres: genresWithStats
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении списка жанров: ' + err.message
    });
  }
};

// Получение жанра по ID
exports.getGenre = async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path', 'author_id', 'style_id'],
        include: [
          {
            model: Author,
            attributes: ['id', 'surname', 'first_name', 'patronymic']
          },
          {
            model: Style,
            attributes: ['id', 'name']
          }
        ]
      }]
    });
    
    if (!genre) {
      return res.status(404).json({
        status: 'error',
        message: 'Жанр с указанным ID не найден'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        genre
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации о жанре: ' + err.message
    });
  }
};

// Обновление жанра по ID
exports.updateGenre = async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id);
    
    if (!genre) {
      return res.status(404).json({
        status: 'error',
        message: 'Жанр с указанным ID не найден'
      });
    }

    // Проверяем, существует ли жанр с таким именем
    if (req.body.name) {
      const existingGenre = await Genre.findOne({
        where: {
          name: req.body.name,
          id: { [Op.ne]: req.params.id }
        }
      });
      
      if (existingGenre) {
        return res.status(400).json({
          status: 'error',
          message: 'Жанр с таким именем уже существует'
        });
      }
    }

    // Обновляем жанр
    await genre.update(req.body);

    // Получаем обновленный жанр
    const updatedGenre = await Genre.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title']
      }]
    });

    res.status(200).json({
      status: 'success',
      message: 'Жанр успешно обновлен',
      data: {
        genre: updatedGenre
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
      message: 'Ошибка при обновлении жанра: ' + err.message
    });
  }
};

// Удаление жанра по ID
exports.deleteGenre = async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id']
      }]
    });
    
    if (!genre) {
      return res.status(404).json({
        status: 'error',
        message: 'Жанр с указанным ID не найден'
      });
    }

    // Проверяем, есть ли произведения с этим жанром
    if (genre.Artworks && genre.Artworks.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить жанр, который используется в произведениях',
        data: {
          artworksCount: genre.Artworks.length
        }
      });
    }

    await genre.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Жанр успешно удален',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении жанра: ' + err.message
    });
  }
};