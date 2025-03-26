import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requirePremium } from '../middleware/premiumAccess';
import { 
  getTrackedDestinations, 
  addTrackedDestination, 
  removeTrackedDestination,
  getDestinationSuggestions
} from '../controllers/destinationController';

// Destination routes
const router = Router();

/**
 * @route   GET /api/destinations/tracked
 * @desc    Get user's tracked destinations
 * @access  Private
 */
router.get('/tracked', authenticate, getTrackedDestinations);

/**
 * @route   POST /api/destinations/tracked
 * @desc    Add destination to tracked destinations
 * @access  Private (Premium)
 */
router.post('/tracked', authenticate, addTrackedDestination);

/**
 * @route   DELETE /api/destinations/tracked/:id
 * @desc    Remove destination from tracked destinations
 * @access  Private
 */
router.delete('/tracked/:id', authenticate, removeTrackedDestination);

/**
 * @route   GET /api/destinations/suggestions
 * @desc    Get premium destination suggestions
 * @access  Private (Premium)
 */
router.get('/suggestions', authenticate, requirePremium, getDestinationSuggestions);

export default router;
