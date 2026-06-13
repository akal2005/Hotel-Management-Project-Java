const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, activityLog } = require('../middleware/errorHandler');
const { body } = require('express-validator');

// All payment routes require authentication
router.use(authenticate);

const chargeRules = [
  body('payment_id').isInt().withMessage('Payment ID must be an integer'),
  body('payment_method').trim().notEmpty().withMessage('Payment method is required'),
];

router.get('/booking/:booking_id', paymentController.getBookingPayments);
router.post('/charge', chargeRules, validate, activityLog('CHARGE_PAYMENT', 'payment'), paymentController.charge);
router.post('/:id/refund', authorize('admin', 'manager'), activityLog('REFUND_PAYMENT', 'payment'), paymentController.refund);
router.get('/:booking_id/invoice', paymentController.getInvoice);

module.exports = router;
