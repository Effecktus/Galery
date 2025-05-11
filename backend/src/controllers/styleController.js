const Style = require('../models/Style');
const { Artwork } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Создание нового стиля
exports.createStyle = async (req, res) => {
  try {
    const newStyle = await Style.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        style: newStyle
      }
    });
  } catch(err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });      
  }
};

// Получение всех стилей
exports.getAllStyles = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.name) {
      where.name = { [Op.like]: `%${req.query.name}%` };
    }

    const { count, rows: styles } = await Style.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
      include: [{
        model: Artwork,
        attributes: ['id', 'title']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        styles,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Получение стиля по ID
exports.getStyle = async (req, res) => {
  try {
    const style = await Style.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });
    
    if (!style) {
      return res.status(404).json({
        status: 'error',
        message: 'Стиль не найден'
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
      message: err.message
    });
  }
};

// Обновление стиля по ID
exports.updateStyle = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const style = await Style.findByPk(req.params.id, { transaction });
    
    if (!style) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Стиль не найден'
      });
    }

    // Проверяем, есть ли связанные artworks
    const artworksCount = await style.countArtworks({ transaction });

    if (artworksCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя изменить стиль, у которого есть произведения'
      });
    }

    await style.update(req.body, { transaction });
    await transaction.commit();

    const updatedStyle = await Style.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        style: updatedStyle
      }
    });
  } catch(err) {
    await transaction.rollback();
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Удаление стиля по ID
exports.deleteStyle = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const style = await Style.findByPk(req.params.id, { transaction });
    
    if (!style) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Стиль не найден'
      });
    }

    // Проверяем, есть ли связанные artworks
    const artworksCount = await style.countArtworks({ transaction });

    if (artworksCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя удалить стиль, у которого есть произведения'
      });
    }

    await style.destroy({ transaction });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch(err) {
    await transaction.rollback();
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};