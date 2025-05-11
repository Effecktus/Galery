const Author = require('../models/Author');
const { Artwork } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

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
    res.status(400).json({
      status: 'error',
      message: err.message
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
      where.date_of_birth = {
        [Op.between]: [
          new Date(req.query.birth_year, 0, 1),
          new Date(req.query.birth_year, 11, 31)
        ]
      };
    }
    if (req.query.death_year) {
      where.date_of_death = {
        [Op.between]: [
          new Date(req.query.death_year, 0, 1),
          new Date(req.query.death_year, 11, 31)
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

// Получение автора по ID
exports.getAuthor = async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id, {
      include: [{
        model: Artwork,
        attributes: ['id', 'title', 'creation_year', 'image_path']
      }]
    });
    
    if (!author) {
      return res.status(404).json({
        status: 'error',
        message: 'Автор не найден'
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
      message: err.message
    });
  }
};

// Обновление автора по ID
exports.updateAuthor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const author = await Author.findByPk(req.params.id, { transaction });
    
    if (!author) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Автор не найден'
      });
    }

    // Проверяем, есть ли связанные artworks
    const artworksCount = await Artwork.count({
      where: { author_id: req.params.id },
      transaction
    });

    if (artworksCount > 0) {
      // Если есть artworks, обновляем только некритичные поля
      const allowedFields = ['patronymic', 'date_of_death'];
      const updateData = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      await author.update(updateData, { transaction });
    } else {
      // Если нет artworks, можно обновить все поля
      await author.update(req.body, { transaction });
    }

    await transaction.commit();

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
    await transaction.rollback();
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Удаление автора по ID
exports.deleteAuthor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const author = await Author.findByPk(req.params.id, { transaction });
    
    if (!author) {
      await transaction.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Автор не найден'
      });
    }

    // Проверяем, есть ли связанные artworks
    const artworksCount = await Artwork.count({
      where: { author_id: req.params.id },
      transaction
    });

    if (artworksCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Нельзя удалить автора, у которого есть произведения'
      });
    }

    await author.destroy({ transaction });
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