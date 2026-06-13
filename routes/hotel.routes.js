const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, activityLog } = require('../middleware/errorHandler');
const { body } = require('express-validator');

// Hotel validation rules
const hotelRules = [
  body('name').trim().notEmpty().withMessage('Hotel name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
];

// Room validation rules
const roomRules = [
  body('room_number').trim().notEmpty().withMessage('Room number is required'),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
];

// Category validation rules
const categoryRules = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('base_price').isNumeric().withMessage('Base price must be a number'),
];

// Public routes
router.get('/', hotelController.listHotels);
router.get('/:id', hotelController.getHotel);
router.get('/:hotel_id/categories', hotelController.listCategories);
router.get('/:hotel_id/rooms', hotelController.listRooms);

// Protected routes (Admin / Manager)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  hotelRules,
  validate,
  activityLog('ADMIN_CREATE_HOTEL', 'hotel'),
  hotelController.createHotel
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  hotelRules,
  validate,
  activityLog('UPDATE_HOTEL', 'hotel'),
  hotelController.updateHotel
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  activityLog('ADMIN_DELETE_HOTEL', 'hotel'),
  hotelController.deleteHotel
);

// Room Categories management
router.post(
  '/:hotel_id/categories',
  authenticate,
  authorize('admin', 'manager'),
  categoryRules,
  validate,
  activityLog('CREATE_CATEGORY', 'room_category'),
  hotelController.createCategory
);

router.put(
  '/:hotel_id/categories/:id',
  authenticate,
  authorize('admin', 'manager'),
  categoryRules,
  validate,
  activityLog('UPDATE_CATEGORY', 'room_category'),
  hotelController.updateCategory
);

router.delete(
  '/:hotel_id/categories/:id',
  authenticate,
  authorize('admin', 'manager'),
  activityLog('DELETE_CATEGORY', 'room_category'),
  hotelController.deleteCategory
);

// Rooms management
router.post(
  '/:hotel_id/rooms',
  authenticate,
  authorize('admin', 'manager'),
  roomRules,
  validate,
  activityLog('CREATE_ROOM', 'room'),
  hotelController.createRoom
);

router.put(
  '/:hotel_id/rooms/:id',
  authenticate,
  authorize('admin', 'manager', 'housekeeping', 'receptionist'),
  activityLog('UPDATE_ROOM', 'room'),
  hotelController.updateRoom
);

router.delete(
  '/:hotel_id/rooms/:id',
  authenticate,
  authorize('admin', 'manager'),
  activityLog('DELETE_ROOM', 'room'),
  hotelController.deleteRoom
);

module.exports = router;
