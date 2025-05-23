const { Artwork, Author, Style, Genre, Exhibition } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Создание нового произведения искусства
exports.createArtwork = async (req, res) => {
  try {
    // Проверяем существование связанных сущностей
    const [author, style, genre] = await Promise.all([
      Author.findByPk(req.body.author_id),
      Style.findByPk(req.body.style_id),
      Genre.findByPk(req.body.genre_id)
    ]);

    if (!author) {
      return res.status(400).json({
        status: 'error',
        message: 'Указанный автор не существует'
      });
    }
    if (!style) {
      return res.status(400).json({
        status: 'error',
        message: 'Указанный стиль не существует'
      });
    }
    if (!genre) {
      return res.status(400).json({
        status: 'error',
        message: 'Указанный жанр не существует'
      });
    }

    // Если указана выставка, проверяем её существование
    if (req.body.exhibition_id) {
      const exhibition = await Exhibition.findByPk(req.body.exhibition_id);
      if (!exhibition) {
        return res.status(400).json({
          status: 'error',
          message: 'Указанная выставка не существует'
        });
      }
    }

    const newArtwork = await Artwork.create(req.body);
    const artwork = await Artwork.findByPk(newArtwork.id, {
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
        },
        { 
          model: Exhibition,
          attributes: ['id', 'title', 'start_date', 'end_date']
        }
      ]
    });

    res.status(201).json({
      status: 'success',
      data: {
        artwork
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
      message: 'Не удалось создать произведение: ' + err.message
    });
  }
};

// Получение всех произведений искусства с фильтрацией и пагинацией
exports.getAllArtworks = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // Базовые условия фильтрации
    const where = {};
    
    // Фильтрация по ID
    if (req.query.author_id) {
      const authorId = parseInt(req.query.author_id, 10);
      if (isNaN(authorId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный ID автора'
        });
      }
      where.author_id = authorId;
    }
    if (req.query.style_id) {
      const styleId = parseInt(req.query.style_id, 10);
      if (isNaN(styleId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный ID стиля'
        });
      }
      where.style_id = styleId;
    }
    if (req.query.genre_id) {
      const genreId = parseInt(req.query.genre_id, 10);
      if (isNaN(genreId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный ID жанра'
        });
      }
      where.genre_id = genreId;
    }
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

    // Фильтрация по названию
    if (req.query.title) {
      where.title = { [Op.like]: `%${req.query.title}%` };
    }

    // Фильтрация по году создания
    if (req.query.creation_year) {
      const year = parseInt(req.query.creation_year, 10);
      if (isNaN(year)) {
        return res.status(400).json({
          status: 'error',
          message: 'Некорректный год создания'
        });
      }
      where.creation_year = year;
    }

    const { count, rows: artworks } = await Artwork.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
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
        },
        { 
          model: Exhibition,
          attributes: ['id', 'title', 'start_date', 'end_date']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: {
        artworks,
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
      message: 'Ошибка при получении списка произведений: ' + err.message
    });
  }
};

// Получение произведения искусства по ID
exports.getArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id, {
      include: [
        { 
          model: Author,
          attributes: ['id', 'surname', 'first_name', 'patronymic', 'date_of_birth', 'date_of_death']
        },
        { 
          model: Style,
          attributes: ['id', 'name']
        },
        { 
          model: Genre,
          attributes: ['id', 'name']
        },
        { 
          model: Exhibition,
          attributes: ['id', 'title', 'start_date', 'end_date', 'location']
        }
      ]
    });

    if (!artwork) {
      return res.status(404).json({
        status: 'error',
        message: 'Произведение искусства с указанным ID не найдено'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        artwork
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации о произведении: ' + err.message
    });
  }
};

// Обновление произведения искусства по ID
exports.updateArtwork = async (req, res) => {
  try {
    // Проверяем существование произведения
    const artwork = await Artwork.findByPk(req.params.id);
    if (!artwork) {
      return res.status(404).json({
        status: 'error',
        message: 'Произведение искусства с указанным ID не найдено'
      });
    }

    // Если обновляются связанные сущности, проверяем их существование
    if (req.body.author_id) {
      const author = await Author.findByPk(req.body.author_id);
      if (!author) {
        return res.status(400).json({
          status: 'error',
          message: 'Указанный автор не существует'
        });
      }
    }
    if (req.body.style_id) {
      const style = await Style.findByPk(req.body.style_id);
      if (!style) {
        return res.status(400).json({
          status: 'error',
          message: 'Указанный стиль не существует'
        });
      }
    }
    if (req.body.genre_id) {
      const genre = await Genre.findByPk(req.body.genre_id);
      if (!genre) {
        return res.status(400).json({
          status: 'error',
          message: 'Указанный жанр не существует'
        });
      }
    }
    if (req.body.exhibition_id) {
      const exhibition = await Exhibition.findByPk(req.body.exhibition_id);
      if (!exhibition) {
        return res.status(400).json({
          status: 'error',
          message: 'Указанная выставка не существует'
        });
      }
    }

    // Обновляем произведение
    await artwork.update(req.body);

    // Получаем обновленное произведение
    const updatedArtwork = await Artwork.findByPk(req.params.id, {
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
        },
        { 
          model: Exhibition,
          attributes: ['id', 'title', 'start_date', 'end_date']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: {
        artwork: updatedArtwork
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
      message: 'Ошибка при обновлении произведения: ' + err.message
    });
  }
};

// Удаление произведения искусства по ID
exports.deleteArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({
        status: 'error',
        message: 'Произведение искусства с указанным ID не найдено'
      });
    }

    await artwork.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Произведение искусства успешно удалено',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении произведения: ' + err.message
    });
  }
};