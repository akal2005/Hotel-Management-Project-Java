const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, activityLog } = require('../middleware/errorHandler');
const { body } = require('express-validator');

// All complaint routes require authentication
router.use(authenticate);

const complaintRules = [
  body('hotel_id').isInt().withMessage('Hotel ID must be an integer'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
];

router.get('/', complaintController.listComplaints);
router.get('/:id', complaintController.getComplaint);
router.post('/', complaintRules, validate, activityLog('CREATE_COMPLAINT', 'complaint'), complaintController.createComplaint);

// Staff assignment & resolution routes
router.put('/:id/assign', authorize('admin', 'manager'), activityLog('ASSIGN_COMPLAINT', 'complaint'), complaintController.assignComplaint);
router.put('/:id/resolve', authorize('admin', 'manager', 'receptionist', 'housekeeping'), activityLog('RESOLVE_COMPLAINT', 'complaint'), complaintController.resolveComplaint);

module.exports = router;
