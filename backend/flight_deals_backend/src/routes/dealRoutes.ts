import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { 
  getAllDeals, 
  getDealById, 
  getFeaturedDeals, 
  searchDeals,
  analyzeFlight,
  analyzeRecentFlights,
  reevaluateDeals
} from '../controllers/dealController';

// Deal routes
const router = Router();

/**
 * @route   GET /api/deals
 * @desc    Get all deals
 * @access  Private
 */
router.get('/', authenticate, getAllDeals);

/**
 * @route   GET /api/deals/featured
 * @desc    Get featured deals
 * @access  Public
 */
router.get('/featured', getFeaturedDeals);

/**
 * @route   GET /api/deals/search
 * @desc    Search deals
 * @access  Private
 */
router.get('/search', authenticate, searchDeals);

/**
 * @route   GET /api/deals/:id
 * @desc    Get deal by ID
 * @access  Private
 */
router.get('/:id', authenticate, getDealById);

/**
 * @route   POST /api/deals/analyze/:flightId
 * @desc    Analyze flight for deals
 * @access  Private (Admin only)
 */
router.post('/analyze/:flightId', authenticate, analyzeFlight);

/**
 * @route   POST /api/deals/analyze-recent
 * @desc    Analyze recent flights for deals
 * @access  Private (Admin only)
 */
router.post('/analyze-recent', authenticate, analyzeRecentFlights);

/**
 * @route   POST /api/deals/reevaluate
 * @desc    Re-evaluate existing deals
 * @access  Private (Admin only)
 */
router.post('/reevaluate', authenticate, reevaluateDeals);

export default router;
