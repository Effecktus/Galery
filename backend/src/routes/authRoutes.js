const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateUser, validateAuth, validate } = require('../middleware');

// Публичные маршруты
router.post('/signup', validateUser, validate, authController.signup);
router.post('/login', validateAuth, validate, authController.login);

// Защищенные маршруты (требуют аутентификации)
router.use(protect);

// Получение информации о текущем пользователе
router.get('/me', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

module.exports = router; 