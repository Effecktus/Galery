const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { validateRegister, validateUserId, validateUserUpdate, validate } = require('../middleware/validation');

// Middleware для логирования
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

// Применяем логирование ко всем маршрутам
router.use(logRequest);

// Защищенные маршруты (только для админов)
router.use(auth.protect);
router.use(auth.restrictTo('admin'));

router.post('/', validateRegister, validate, userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/:id', validateUserId, validate, userController.getUser);
router.put('/:id', validateUserId, validateUserUpdate, validate, userController.updateUser);
router.delete('/:id', validateUserId, validate, userController.deleteUser);

module.exports = router;
