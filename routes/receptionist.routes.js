const express = require('express');
const router = express.Router();
const receptionistController = require('../controllers/receptionistController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, activityLog } = require('../middleware/errorHandler');
const { body } = require('express-validator');

// All receptionist routes require authentication and proper role authorization
router.use(authenticate);
router.use(authorize('receptionist', 'manager', 'admin'));

const walkInRules = [
  body('hotel_id').isInt().withMessage('Hotel ID must be an integer'),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('check_in_date').isDate().withMessage('Valid check-in date is required'),
  body('check_out_date').isDate().withMessage('Valid check-out date is required'),
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
];

router.get('/dashboard', receptionistController.getDashboard);
router.post('/check-in/:booking_id', activityLog('FRONT_DESK_CHECKIN', 'booking'), receptionistController.checkIn);
router.post('/check-out/:booking_id', activityLog('FRONT_DESK_CHECKOUT', 'booking'), receptionistController.checkOut);
router.post('/walk-in', walkInRules, validate, activityLog('FRONT_DESK_WALKIN', 'booking'), receptionistController.walkInBooking);

module.exports = router;
