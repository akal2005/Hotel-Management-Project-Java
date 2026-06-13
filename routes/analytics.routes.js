const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('manager', 'admin'));

router.get('/dashboard', analyticsController.getManagerDashboard);

module.exports = router;
