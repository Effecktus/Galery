const { Artwork, Author, Style, Genre, Exhibition } = require('../models');
const { Op, ValidationError } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Функция для удаления файла изображения
const deleteImageFile = (imagePath) => {
  if (!imagePath) return;
  
  // Получаем полный путь к файлу
  const fullPath = path.join(__dirname, '../public', imagePath);
  
  // Проверяем существование файла и удаляем его
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// Создание нового произведения искусства
exports.createArtwork = async (req, res) => {
  try {
    // Проверяем наличие файла
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Изображение обязательно'
      });
    }

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

    // Добавляем путь к изображению в данные произведения
    req.body.image_path = `/upload/${req.file.filename}`;

    const artwork = await Artwork.create(req.body);

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
    res.status(500).json({
      status: 'error',
      message: 'Не удалось создать произведение: ' + err.message
    });
  }
};

// Получение всех произведений искусства
exports.getAllArtworks = async (req, res) => {
  try {
    // Базовые условия фильтрации
    const where = {};
    
    // Фильтрация по названию произведения
    if (req.query.search) {
      where.title = { [Op.like]: `%${req.query.search}%` };
    }

    // Фильтрация по году создания
    if (req.query.search) {
      const year = parseInt(req.query.search, 10);
      if (!isNaN(year)) {
        where.creation_year = year;
      }
    }

    // Настройка включения связанных моделей с условиями фильтрации
    const include = [
      { 
        model: Author,
        attributes: ['id', 'surname', 'first_name', 'patronymic'],
        where: req.query.search ? {
          [Op.or]: [
            { surname: { [Op.like]: `%${req.query.search}%` } },
            { first_name: { [Op.like]: `%${req.query.search}%` } },
            { patronymic: { [Op.like]: `%${req.query.search}%` } }
          ]
        } : undefined,
        required: false
      },
      { 
        model: Style,
        attributes: ['id', 'name'],
        where: req.query.search ? {
          name: { [Op.like]: `%${req.query.search}%` }
        } : undefined,
        required: false
      },
      { 
        model: Genre,
        attributes: ['id', 'name'],
        where: req.query.search ? {
          name: { [Op.like]: `%${req.query.search}%` }
        } : undefined,
        required: false
      },
      { 
        model: Exhibition,
        attributes: ['id'],
        through: { attributes: [] }, // Исключаем атрибуты промежуточной таблицы
        required: false
      }
    ];

    const artworks = await Artwork.findAll({
      where,
      include,
      distinct: true
    });

    // Добавляем статистику по выставкам
    const artworksWithStats = artworks.map(artwork => ({
      ...artwork.toJSON(),
      statistics: {
        total_exhibitions: artwork.Exhibitions ? artwork.Exhibitions.length : 0
      }
    }));

    res.status(200).json({
      status: 'success',
      data: {
        artworks: artworksWithStats
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

    // Если загружено новое изображение, удаляем старое
    if (req.file) {
      deleteImageFile(artwork.image_path);
      req.body.image_path = `/upload/${req.file.filename}`;
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
    const artwork = await Artwork.findByPk(req.params.id, {
      include: [{
        model: Exhibition,
        attributes: ['id', 'title'],
        through: { attributes: [] }
      }]
    });
    
    if (!artwork) {
      return res.status(404).json({
        status: 'error',
        message: 'Произведение искусства с указанным ID не найдено'
      });
    }

    // Проверяем, участвует ли произведение в каких-либо выставках
    if (artwork.Exhibitions && artwork.Exhibitions.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить произведение, так как оно участвует в выставках',
        data: {
          exhibitions: artwork.Exhibitions.map(exhibition => ({
            id: exhibition.id,
            title: exhibition.title
          }))
        }
      });
    }

    // Сохраняем путь к изображению перед удалением произведения
    const imagePath = artwork.image_path;

    // Удаляем произведение
    await artwork.destroy();

    // Удаляем файл изображения
    deleteImageFile(imagePath);

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