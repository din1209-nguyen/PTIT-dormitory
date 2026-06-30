import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { authLimiter } from '../../common/middlewares/rateLimit.middleware.js';
import { loginSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema, changePasswordSchema } from './auth.validation.js';
import * as ctrl from './auth.controller.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(ctrl.loginHandler));
router.post('/refresh', authLimiter, asyncHandler(ctrl.refreshHandler));
router.post('/logout', authenticate, asyncHandler(ctrl.logoutHandler));
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(ctrl.forgotPasswordHandler));
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), asyncHandler(ctrl.verifyOtpHandler));
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(ctrl.resetPasswordHandler));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(ctrl.changePasswordHandler));
router.get('/me', authenticate, asyncHandler(ctrl.getMeHandler));

export default router;
