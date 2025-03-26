import { CronJob } from 'cron';
import { NewsletterService } from '../services/notifications/newsletterService';
import { logger } from '../utils/logger';

// Initialize newsletter service
const newsletterService = new NewsletterService();

/**
 * Initialize newsletter jobs
 */
export const initializeNewsletterJobs = async () => {
  try {
    logger.info('Initializing newsletter jobs');

    // Schedule job to process pending notifications every 15 minutes
    const processNotificationsJob = new CronJob('*/15 * * * *', async () => {
      logger.info('Starting scheduled processing of pending notifications');
      try {
        const processedCount = await newsletterService.processPendingNotifications(100);
        logger.info(`Processed ${processedCount} notifications`);
      } catch (error) {
        logger.error(`Error in notification processing job: ${error}`);
      }
    });

    // Schedule job to send weekly newsletter every Monday at 9:00 AM
    const weeklyNewsletterJob = new CronJob('0 9 * * 1', async () => {
      logger.info('Starting scheduled weekly newsletter sending');
      try {
        const sentCount = await newsletterService.sendWeeklyNewsletter();
        logger.info(`Sent weekly newsletter to ${sentCount} users`);
      } catch (error) {
        logger.error(`Error in weekly newsletter job: ${error}`);
      }
    });

    // Start the jobs
    processNotificationsJob.start();
    weeklyNewsletterJob.start();

    logger.info('Newsletter jobs scheduled successfully');
  } catch (error) {
    logger.error(`Failed to initialize newsletter jobs: ${error}`);
  }
};
