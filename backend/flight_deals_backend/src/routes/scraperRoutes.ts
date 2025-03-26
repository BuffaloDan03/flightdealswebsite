import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { scrapeRoute, scrapePopularRoutes } from '../controllers/scraperController';

// Scraper routes
const router = Router();

/**
 * @route   POST /api/scraper/route
 * @desc    Scrape flights for a specific route
 * @access  Private (Admin only)
 */
router.post('/route', authenticate, scrapeRoute);

/**
 * @route   POST /api/scraper/popular
 * @desc    Scrape flights for popular routes
 * @access  Private (Admin only)
 */
router.post('/popular', authenticate, scrapePopularRoutes);

export default router;
