/**
 * Auth Routes - QAssure Platform
 * /api/v1/auth/*
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const {
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  RefreshTokenSchema,
  SessionParamsSchema,
  CreateServiceTokenSchema,
  RevokeServiceTokenSchema
} = require('../validation/auth.schema');
const { validate } = require('../middleware/validationMiddleware');

// Validation middleware helpers
const validateRegister = validate(RegisterSchema);
const validateLogin = validate(LoginSchema);
const validateVerifyEmail = validate(VerifyEmailSchema);
const validateResendVerification = validate(ResendVerificationSchema);
const validateForgotPassword = validate(ForgotPasswordSchema);
const validateResetPassword = validate(ResetPasswordSchema);
const validateChangePassword = validate(ChangePasswordSchema);
const validateRefreshToken = validate(RefreshTokenSchema);
const validateSessionParams = validate(SessionParamsSchema, 'params');
const validateCreateServiceToken = validate(CreateServiceTokenSchema);
const validateRevokeServiceToken = validate(RevokeServiceTokenSchema);

// ==================== Public Routes ====================
// Registration & Verification
router.post('/register', validateRegister, authController.register);
router.post('/verify-email', validateVerifyEmail, authController.verifyEmail);
router.post('/resend-verification', validateResendVerification, authController.resendVerification);

// Login
router.post('/login', validateLogin, authController.login);
router.post('/refresh', validateRefreshToken, authController.refresh);

// Password Reset
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// ==================== Protected Routes ====================
// Session Management
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.me);
router.get('/sessions', authenticate, authController.sessions);
router.delete('/sessions/:sessionId', authenticate, validateSessionParams, authController.revokeSession);
router.post('/validate', authenticate, authController.validate);

// Service Token Management
router.post('/service-token', authenticate, validateCreateServiceToken, authController.createServiceToken);
router.post('/service-token/revoke', authenticate, validateRevokeServiceToken, authController.revokeServiceToken);

// Password Change (authenticated)
router.post('/change-password', authenticate, validateChangePassword, authController.changePassword);

module.exports = router;
