import { CronJob } from 'cron';
import { ScraperService } from '../services/scraper/scraperService';
import { logger } from '../utils/logger';

// Initialize scraper service
const scraperService = new ScraperService();

/**
 * Initialize scraper jobs
 */
export const initializeScraperJobs = async () => {
  try {
    // Initialize scraper service
    await scraperService.initialize();
    logger.info('Scraper service initialized for scheduled jobs');

    // Schedule job to scrape popular routes daily at 1:00 AM
    const dailyScrapingJob = new CronJob('0 1 * * *', async () => {
      logger.info('Starting daily scraping of popular routes');
      try {
        await scraperService.scrapePopularRoutes();
        logger.info('Completed daily scraping of popular routes');
      } catch (error) {
        logger.error(`Error in daily scraping job: ${error}`);
      }
    });

    // Schedule job to check for expired deals daily at 2:00 AM
    const expiredDealsJob = new CronJob('0 2 * * *', async () => {
      logger.info('Checking for expired deals');
      try {
        await cleanupExpiredDeals();
        logger.info('Completed expired deals cleanup');
      } catch (error) {
        logger.error(`Error in expired deals cleanup job: ${error}`);
      }
    });

    // Start the jobs
    dailyScrapingJob.start();
    expiredDealsJob.start();

    logger.info('Scraper jobs scheduled successfully');
  } catch (error) {
    logger.error(`Failed to initialize scraper jobs: ${error}`);
  }
};

/**
 * Clean up expired deals
 */
const cleanupExpiredDeals = async () => {
  try {
    const prisma = (scraperService as any).prisma;
    if (!prisma) {
      logger.error('Prisma client not available in scraper service');
      return;
    }

    const now = new Date();
    
    // Find expired deals
    const expiredDeals = await prisma.deal.findMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    logger.info(`Found ${expiredDeals.length} expired deals`);

    // Delete expired deals
    if (expiredDeals.length > 0) {
      await prisma.deal.deleteMany({
        where: {
          id: {
            in: expiredDeals.map((deal: any) => deal.id)
          }
        }
      });
      
      logger.info(`Deleted ${expiredDeals.length} expired deals`);
    }
  } catch (error) {
    logger.error(`Error cleaning up expired deals: ${error}`);
    throw error;
  }
};
