const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerPatient, login, refreshToken, logout, getMe } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');
const { validateBody, loginSchema, patientRegisterSchema, refreshTokenSchema } = require('../middleware/validator');

const router = express.Router();

// Local rate limiting on login endpoint: max 20 attempts per 5 minutes
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again after 5 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Public Routes
router.post('/register', validateBody(patientRegisterSchema), registerPatient);
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshTokenSchema), refreshToken);
router.post('/logout', logout);

// Protected Routes
router.get('/me', authenticateJWT, getMe);

module.exports = router;
