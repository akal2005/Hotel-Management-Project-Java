'use strict';

const express        = require('express');
const { body }       = require('express-validator');
const rateLimit      = require('express-rate-limit');

const authController          = require('../controllers/authController');
const { authenticate }        = require('../middleware/auth');
const { validate, activityLog } = require('../middleware/errorHandler');

const router = express.Router();

/* ─── per-route rate limiters ─────────────────────────────── */

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 min
  max: 10,
  message: {
    success: false,
    message: 'Too many attempts. Please wait 15 minutes and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,        // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Too many registrations from this IP. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ─── validation rule sets ────────────────────────────────── */

const registerRules = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name must be under 100 characters'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 100 }).withMessage('Last name must be under 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Enter a valid phone number'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('current_password')
    .notEmpty().withMessage('Current password is required'),

  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number'),

  body('confirm_password')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),
];

const resetPasswordRules = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),

  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('confirm_password')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const updateProfileRules = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Enter a valid phone number'),
];

/* ─── Routes ──────────────────────────────────────────────── */

router.post(
  '/register',
  registerLimiter,
  registerRules,
  validate,
  activityLog('USER_REGISTER', 'user'),
  authController.register,
);

router.post(
  '/login',
  strictLimiter,
  loginRules,
  validate,
  authController.login,
);

router.post(
  '/refresh',
  authController.refreshToken,
);

router.post(
  '/logout',
  authenticate,
  activityLog('USER_LOGOUT', 'user'),
  authController.logout,
);

router.get(
  '/me',
  authenticate,
  authController.me,
);

router.put(
  '/me',
  authenticate,
  updateProfileRules,
  validate,
  activityLog('PROFILE_UPDATE', 'user'),
  authController.updateProfile,
);

router.put(
  '/change-password',
  authenticate,
  strictLimiter,
  changePasswordRules,
  validate,
  activityLog('PASSWORD_CHANGE', 'user'),
  authController.changePassword,
);

router.post(
  '/forgot-password',
  strictLimiter,
  forgotPasswordRules,
  validate,
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  strictLimiter,
  resetPasswordRules,
  validate,
  activityLog('PASSWORD_RESET', 'user'),
  authController.resetPassword,
);

router.get(
  '/verify-email/:token',
  authController.verifyEmail,
);

module.exports = router;
