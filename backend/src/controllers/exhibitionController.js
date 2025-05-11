const Exhibition = require('../models/Exhibition');
const { Artwork } = require('../models');
const { Op } = require('sequelize');

// Создание новой выставки
exports.createExhibition = async (req, res) => {
  try {
    const newExhibition = await Exhibition.create(req.body);
    const exhibition = await Exhibition.findByPk(newExhibition.id, {
      include: [{ model: Artwork }]
    });
    res.status(201).json({
      status: 'success',
      data: {
        exhibition
      }
    });
  } catch(err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });      
  }
};

// Получение всех выставок с фильтрацией и пагинацией
exports.getAllExhibitions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // Базовые условия фильтрации
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.location) where.location = { [Op.like]: `%${req.query.location}%` };
    if (req.query.title) where.title = { [Op.like]: `%${req.query.title}%` };
    
    // Фильтрация по датам
    if (req.query.start_date) {
      where.start_date = { [Op.gte]: new Date(req.query.start_date) };
    }
    if (req.query.end_date) {
      where.end_date = { [Op.lte]: new Date(req.query.end_date) };
    }

    // Фильтрация по цене
    if (req.query.min_price) {
      where.ticket_price = { ...where.ticket_price, [Op.gte]: req.query.min_price };
    }
    if (req.query.max_price) {
      where.ticket_price = { ...where.ticket_price, [Op.lte]: req.query.max_price };
    }

    const { count, rows: exhibitions } = await Exhibition.findAndCountAll({
      where,
      limit,
      offset,
      order: [['start_date', 'ASC']],
      include: [{ model: Artwork }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        exhibitions,
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

// Получение выставки по ID
exports.getExhibition = async (req, res) => {
  try {
    const exhibition = await Exhibition.findByPk(req.params.id, {
      include: [{ model: Artwork }]
    });
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }
    res.status(200).json({
      status: 'success',
      data: { exhibition }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Обновление выставки по ID
exports.updateExhibition = async (req, res) => {
  try {
    const [updated] = await Exhibition.update(req.body, {
      where: { id: req.params.id },
      returning: true
    });
    if (updated[0] === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }
    const updatedExhibition = await Exhibition.findByPk(req.params.id, {
      include: [{ model: Artwork }]
    });
    res.status(200).json({
      status: 'success',
      data: { exhibition: updatedExhibition }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Обновление статуса выставки
exports.updateExhibitionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const exhibition = await Exhibition.findByPk(req.params.id);
    
    if (!exhibition) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
      });
    }

    // Проверка возможности изменения статуса
    if (status === 'completed' && new Date(exhibition.end_date) > new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя завершить выставку до даты окончания'
      });
    }

    const [updated] = await Exhibition.update(
      { status },
      { where: { id: req.params.id } }
    );

    const updatedExhibition = await Exhibition.findByPk(req.params.id, {
      include: [{ model: Artwork }]
    });

    res.status(200).json({
      status: 'success',
      data: { exhibition: updatedExhibition }
    });
  } catch(err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Удаление выставки по ID
exports.deleteExhibition = async (req, res) => {
  try {
    const deleted = await Exhibition.destroy({
      where: { id: req.params.id }
    });
    if (deleted === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Выставка не найдена'
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