const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const { validate, activityLog } = require('../middleware/errorHandler');
const { body } = require('express-validator');

// Availability check is public
router.post('/check-availability', bookingController.checkAvailability);

// All other booking routes require authentication
router.use(authenticate);

const bookingRules = [
  body('hotel_id').isInt().withMessage('Hotel ID must be an integer'),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('check_in_date').isDate().withMessage('Valid check-in date is required'),
  body('check_out_date').isDate().withMessage('Valid check-out date is required'),
];

router.get('/', bookingController.listBookings);
router.get('/:id', bookingController.getBooking);
router.post('/', bookingRules, validate, activityLog('CREATE_BOOKING', 'booking'), bookingController.createBooking);
router.post('/:id/cancel', activityLog('CANCEL_BOOKING', 'booking'), bookingController.cancelBooking);

module.exports = router;
