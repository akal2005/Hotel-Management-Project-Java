const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.post('/read-all', notificationController.markAllAsRead);
router.post('/:id/read', notificationController.markAsRead);

module.exports = router;
