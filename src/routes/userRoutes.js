const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { validateAdminCreateUser, validateUserId, validateUserUpdate, validate } = require('../middleware/validation');

const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
};

router.use(logRequest);
router.use(auth.protect);

router.patch('/me', validateUserUpdate, validate, userController.updateMe);

router.use(auth.restrictTo('admin'));

router.post('/', validateAdminCreateUser, validate, userController.createUser);
router.get('/', userController.getAllUsers);
router.get('/:id', validateUserId, validate, userController.getUser);
router.patch('/:id', validateUserId, validateUserUpdate, validate, userController.updateUser);
router.delete('/:id', validateUserId, validate, userController.deleteUser);

module.exports = router;