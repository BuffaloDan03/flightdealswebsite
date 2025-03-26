import { CronJob } from 'cron';
import { DealDetectionService } from '../services/deals/dealDetectionService';
import { logger } from '../utils/logger';

// Initialize deal detection service
const dealDetectionService = new DealDetectionService();

/**
 * Initialize deal detection jobs
 */
export const initializeDealJobs = async () => {
  try {
    logger.info('Initializing deal detection jobs');

    // Schedule job to analyze recent flights daily at 3:00 AM
    const analyzeRecentFlightsJob = new CronJob('0 3 * * *', async () => {
      logger.info('Starting daily analysis of recent flights');
      try {
        await dealDetectionService.analyzeRecentFlights();
        logger.info('Completed daily analysis of recent flights');
      } catch (error) {
        logger.error(`Error in daily flight analysis job: ${error}`);
      }
    });

    // Schedule job to re-evaluate existing deals daily at 4:00 AM
    const reevaluateDealsJob = new CronJob('0 4 * * *', async () => {
      logger.info('Starting daily re-evaluation of existing deals');
      try {
        await dealDetectionService.reevaluateExistingDeals();
        logger.info('Completed daily re-evaluation of existing deals');
      } catch (error) {
        logger.error(`Error in daily deal re-evaluation job: ${error}`);
      }
    });

    // Start the jobs
    analyzeRecentFlightsJob.start();
    reevaluateDealsJob.start();

    logger.info('Deal detection jobs scheduled successfully');
  } catch (error) {
    logger.error(`Failed to initialize deal detection jobs: ${error}`);
  }
};
