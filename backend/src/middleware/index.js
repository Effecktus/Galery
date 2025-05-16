const { validationResult } = require('express-validator');
const ticketValidation = require('./ticketValidation');
const exhibitionValidation = require('./exhibitionValidation');
const styleValidation = require('./styleValidation');
const genreValidation = require('./genreValidation');
const artworkValidation = require('./artworkValidation');
const authorValidation = require('./authorValidation');
const userValidation = require('./userValidation');

// Middleware для проверки результатов валидации
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Экспортируем все валидации и функцию validate
module.exports = {
  validate,
  validateAuth: userValidation.validateAuth,
  validateArtworkUpdate: artworkValidation.validateArtworkUpdate,
  ...ticketValidation,
  ...exhibitionValidation,
  ...styleValidation,
  ...genreValidation,
  ...artworkValidation,
  ...authorValidation,
  ...userValidation
}; 