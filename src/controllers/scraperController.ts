import { Request, Response } from 'express';
import { ScraperService } from '../services/scraper/scraperService';
import { logger } from '../utils/logger';

// Initialize scraper service
const scraperService = new ScraperService();

/**
 * Initialize the scraper service
 */
export const initializeScraperService = async () => {
  try {
    await scraperService.initialize();
    logger.info('Scraper service initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize scraper service: ${error}`);
  }
};

/**
 * Trigger scraping for a specific route
 * @route POST /api/scraper/route
 */
export const scrapeRoute = async (req: Request, res: Response) => {
  try {
    const { origin, destination, departureDate, returnDate } = req.body;
    
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
    
    // Parse dates
    const departureDateObj = new Date(departureDate);
    const returnDateObj = returnDate ? new Date(returnDate) : undefined;
    
    // Validate dates
    if (isNaN(departureDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid departure date' });
    }
    
    if (returnDateObj && isNaN(returnDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid return date' });
    }
    
    // Start scraping in the background
    res.status(202).json({ message: 'Scraping started' });
    
    // Perform scraping
    const results = await scraperService.scrapeRoute(
      origin,
      destination,
      departureDateObj,
      returnDateObj
    );
    
    logger.info(`Scraped ${results.length} flights for ${origin} to ${destination}`);
  } catch (error) {
    logger.error(`Error in scrapeRoute: ${error}`);
    // Response already sent, so no need to send error
  }
};

/**
 * Trigger scraping for popular routes
 * @route POST /api/scraper/popular
 */
export const scrapePopularRoutes = async (req: Request, res: Response) => {
  try {
    // Start scraping in the background
    res.status(202).json({ message: 'Scraping popular routes started' });
    
    // Perform scraping
    await scraperService.scrapePopularRoutes();
    
    logger.info('Completed scraping popular routes');
  } catch (error) {
    logger.error(`Error in scrapePopularRoutes: ${error}`);
    // Response already sent, so no need to send error
  }
};
