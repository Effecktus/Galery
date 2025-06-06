const { Style, Artwork, Author, Genre } = require('../models');
const { Op, ValidationError } = require('sequelize');

// Создание нового стиля
exports.createStyle = async (req, res) => {
  try {
    const newStyle = await Style.create(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Стиль успешно создан',
      data: { style: newStyle }
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
      message: 'Не удалось создать стиль: ' + err.message
    });      
  }
};

// Получение всех стилей
exports.getAllStyles = async (req, res) => {
  try {
    // Фильтрация по названию
    const where = {};
    if (req.query.name) {
      where.name = { [Op.like]: `%${req.query.name}%` };
    }

    const styles = await Style.findAll({
      where,
      include: [{
        model: Artwork,
        attributes: ['id', 'title'],
        required: req.query.has_artworks === 'true'
      }],
      distinct: true
    });

    // Добавляем статистику по произведениям
    const stylesWithStats = styles.map(style => ({
      ...style.toJSON(),
      statistics: {
        total_artworks: style.Artworks ? style.Artworks.length : 0
      }
    }));

    res.status(200).json({
      status: 'success',
      data: {
        styles: stylesWithStats
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении списка стилей: ' + err.message
    });
  }
};

// Получение стиля по ID
exports.getStyle = async (req, res) => {
  try {
    const style = await Style.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path', 'author_id', 'genre_id'],
        include: [
          {
            model: Author,
            attributes: ['id', 'surname', 'first_name', 'patronymic']
          },
          {
            model: Genre,
            attributes: ['id', 'name']
          }
        ]
      }]
    });
    
    if (!style) {
      return res.status(404).json({
        status: 'error',
        message: 'Стиль с указанным ID не найден'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        style
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при получении информации о стиле: ' + err.message
    });
  }
};

// Обновление стиля по ID
exports.updateStyle = async (req, res) => {
  try {
    const style = await Style.findByPk(req.params.id);
    
    if (!style) {
      return res.status(404).json({
        status: 'error',
        message: 'Стиль с указанным ID не найден'
      });
    }

    // Проверяем, существует ли стиль с таким именем
    if (req.body.name) {
      const existingStyle = await Style.findOne({
        where: {
          name: req.body.name,
          id: { [Op.ne]: req.params.id }
        }
      });
      
      if (existingStyle) {
        return res.status(400).json({
          status: 'error',
          message: 'Стиль с таким именем уже существует'
        });
      }
    }

    // Обновляем стиль
    await style.update(req.body);

    // Получаем обновленный стиль
    const updatedStyle = await Style.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });

    res.status(200).json({
      status: 'success',
      message: 'Стиль успешно обновлен',
      data: {
        style: updatedStyle
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
      message: 'Ошибка при обновлении стиля: ' + err.message
    });
  }
};

// Удаление стиля по ID
exports.deleteStyle = async (req, res) => {
  try {
    const style = await Style.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id']
      }]
    });
    
    if (!style) {
      return res.status(404).json({
        status: 'error',
        message: 'Стиль с указанным ID не найден'
      });
    }

    // Проверяем, есть ли произведения с этим стилем
    if (style.Artworks && style.Artworks.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Невозможно удалить стиль, который используется в произведениях',
        data : {
          artworksCount: style.Artwork.length
        }
      });
    }

    await style.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Стиль успешно удален',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при удалении стиля: ' + err.message
    });
  }
};