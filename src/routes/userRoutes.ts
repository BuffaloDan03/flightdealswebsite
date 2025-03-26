import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getUserProfile, updateUserProfile, getUserPreferences, updateUserPreferences } from '../controllers/userController';

// User routes
const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, updateUserProfile);

/**
 * @route   GET /api/users/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', authenticate, getUserPreferences);

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', authenticate, updateUserPreferences);

export default router;
