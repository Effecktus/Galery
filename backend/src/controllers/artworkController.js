const Artwork = require('../models/Artwork');
const { Author, Style, Genre, Exhibition } = require('../models');
const { Op } = require('sequelize');

// Создание нового произведения искусства
exports.createArtwork = async (req, res) => {
  try {
    const newArtwork = await Artwork.create(req.body);
    const artwork = await Artwork.findByPk(newArtwork.id, {
      include: [
        { model: Author },
        { model: Style },
        { model: Genre },
        { model: Exhibition }
      ]
    });
    res.status(201).json({
      status: 'success',
      data: {
        artwork
      }
    });
  } catch(err) {
    res.status(400).json({
      status: 'error',
      message: err.message
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
    if (req.query.author_id) where.author_id = req.query.author_id;
    if (req.query.style_id) where.style_id = req.query.style_id;
    if (req.query.genre_id) where.genre_id = req.query.genre_id;
    if (req.query.exhibition_id) where.exhibition_id = req.query.exhibition_id;
    if (req.query.title) where.title = { [Op.like]: `%${req.query.title}%` };

    const { count, rows: artworks } = await Artwork.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: Author },
        { model: Style },
        { model: Genre },
        { model: Exhibition }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: {
        artworks,
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

// Получение произведения искусства по ID
exports.getArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findByPk(req.params.id, {
      include: [
        { model: Author },
        { model: Style },
        { model: Genre },
        { model: Exhibition }
      ]
    });
    if (!artwork) {
      return res.status(404).json({
        status: 'error',
        message: 'Произведение искусства не найдено'
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
      message: err.message
    });
  }
};

// Обновление произведения искусства по ID
exports.updateArtwork = async (req, res) => {
  try {
    // Проверяем, существует ли произведение искусства
    const artwork = await Artwork.findByPk(req.params.id);
    if (!artwork) {
      return res.status(404).json({
        status: 'error',
        message: 'Произведение искусства не найдено'
      });
    }

    // Обновляем произведение
    await Artwork.update(req.body, {
      where: { id: req.params.id }
    });

    // Получаем обновленное произведение искусства
    const updatedArtwork = await Artwork.findByPk(req.params.id, {
      include: [
        { model: Author },
        { model: Style },
        { model: Genre },
        { model: Exhibition }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: {
        artwork: updatedArtwork
      }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Удаление произведения искусства по ID
exports.deleteArtwork = async (req, res) => {
  try {
    const deleted = await Artwork.destroy({
      where: { id: req.params.id }
    });
    if (deleted === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Произведение искусства не найдено'
      });
    }
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};