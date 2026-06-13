const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, activityLog } = require('../middleware/errorHandler');
const { body } = require('express-validator');

// All user management routes require admin rights
router.use(authenticate);
router.use(authorize('admin'));

const userRules = [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('role_id').isInt().withMessage('Role ID must be an integer'),
];

router.get('/', userController.listUsers);
router.post('/', userRules, validate, activityLog('ADMIN_CREATE_USER', 'user'), userController.createUser);
router.post('/staff/assign', activityLog('ADMIN_ASSIGN_STAFF', 'hotel_staff'), userController.assignStaff);

router.get('/:id', userController.getUser);
router.put('/:id', userRules, validate, activityLog('ADMIN_UPDATE_USER', 'user'), userController.updateUser);
router.delete('/:id', activityLog('ADMIN_DEACTIVATE_USER', 'user'), userController.deleteUser);

module.exports = router;
