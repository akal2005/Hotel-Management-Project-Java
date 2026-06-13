const express = require('express');
const router = express.Router();

// Import sub-routers
const userRoutes = require('./user.routes');
const hotelRoutes = require('./hotel.routes');
const bookingRoutes = require('./booking.routes');
const receptionistRoutes = require('./receptionist.routes');
const complaintRoutes = require('./complaint.routes');
const paymentRoutes = require('./payment.routes');
const analyticsRoutes = require('./analytics.routes');
const notificationRoutes = require('./notification.routes');

// Mount routes
router.use('/users', userRoutes);
router.use('/hotels', hotelRoutes);
router.use('/bookings', bookingRoutes);
router.use('/receptionist', receptionistRoutes);
router.use('/complaints', complaintRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);

// Base API route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Hotel Management System API',
  });
});

module.exports = router;
