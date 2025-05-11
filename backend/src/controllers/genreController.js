const Genre = require('../models/Genre');
const { Artwork } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Создание нового жанра
exports.createGenre = async (req, res) => {
  try {
    const newGenre = await Genre.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        genre: newGenre
      }
    });
  } catch(err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });      
  }
};

// Получение всех жанров
exports.getAllGenres = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.name) {
      where.name = { [Op.like]: `%${req.query.name}%` };
    }

    const { count, rows: genres } = await Genre.findAndCountAll({
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
        genres,
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

// Получение жанра по ID
exports.getGenre = async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });
    
    if (!genre) {
      return res.status(404).json({
        status: 'error',
        message: 'Жанр не найден'
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
      message: err.message
    });
  }
};

// Обновление жанра по ID
exports.updateGenre = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const genre = await Genre.findByPk(req.params.id, { transaction });
    
    if (!genre) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Жанр не найден'
      });
    }

    // Проверяем, есть ли связанные artworks
    const artworksCount = await genre.countArtworks({ transaction });

    if (artworksCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя изменить жанр, у которого есть произведения'
      });
    }

    await genre.update(req.body, { transaction });
    await transaction.commit();

    const updatedGenre = await Genre.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        genre: updatedGenre
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

// Удаление жанра по ID
exports.deleteGenre = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const genre = await Genre.findByPk(req.params.id, { transaction });
    
    if (!genre) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Жанр не найден'
      });
    }

    // Проверяем, есть ли связанные artworks
    const artworksCount = await genre.countArtworks({ transaction });

    if (artworksCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя удалить жанр, у которого есть произведения'
      });
    }

    await genre.destroy({ transaction });
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