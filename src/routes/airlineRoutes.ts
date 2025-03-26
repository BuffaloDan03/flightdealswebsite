import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePremium } from '../middleware/premiumAccess';
import { 
  getAirlines, 
  getAirlinePreferences, 
  updateAirlinePreferences,
  getCabinClasses,
  updateCabinClassPreferences
} from '../controllers/airlineController';

// Airline routes
const router = Router();

/**
 * @route   GET /api/airlines
 * @desc    Get all airlines
 * @access  Public
 */
router.get('/', getAirlines);

/**
 * @route   GET /api/airlines/preferences
 * @desc    Get user's airline preferences
 * @access  Private
 */
router.get('/preferences', authenticate, getAirlinePreferences);

/**
 * @route   PUT /api/airlines/preferences
 * @desc    Update user's airline preferences
 * @access  Private
 */
router.put('/preferences', authenticate, updateAirlinePreferences);

/**
 * @route   GET /api/airlines/cabin-classes
 * @desc    Get premium cabin class options
 * @access  Private
 */
router.get('/cabin-classes', authenticate, getCabinClasses);

/**
 * @route   PUT /api/airlines/cabin-classes
 * @desc    Update user's cabin class preferences
 * @access  Private
 */
router.put('/cabin-classes', authenticate, updateCabinClassPreferences);

export default router;
