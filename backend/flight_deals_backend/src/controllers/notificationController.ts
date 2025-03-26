import { Request, Response } from 'express';
import { NewsletterService } from '../services/notifications/newsletterService';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

// Initialize newsletter service
const newsletterService = new NewsletterService();

/**
 * Get notifications for a user
 * @route GET /api/notifications
 */
export const getUserNotifications = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const { page = '1', limit = '10', status } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter conditions
    const where: any = {
      userId: user.id
    };
    
    if (status) {
      where.status = status;
    }
    
    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        deal: {
          include: {
            flight: {
              include: {
                originAirport: true,
                destinationAirport: true,
                airlineInfo: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum
    });
    
    // Get total count for pagination
    const totalNotifications = await prisma.notification.count({ where });
    
    res.status(200).json({
      notifications,
      pagination: {
        total: totalNotifications,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalNotifications / limitNum)
      }
    });
  } catch (error) {
    logger.error(`Error in getUserNotifications: ${error}`);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

/**
 * Mark notification as read
 * @route PUT /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: user.id
      }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Update notification
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        readAt: new Date()
      }
    });
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error(`Error in markNotificationAsRead: ${error}`);
    res.status(500).json({ message: 'Server error while updating notification' });
  }
};

/**
 * Track email open
 * @route GET /api/notifications/track/open/:id
 */
export const trackEmailOpen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Track email open
    await newsletterService.trackEmailOpen(parseInt(id, 10));
    
    // Return a 1x1 transparent pixel
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    logger.error(`Error in trackEmailOpen: ${error}`);
    // Return a 1x1 transparent pixel even on error
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
};

/**
 * Track email click
 * @route GET /api/notifications/track/click/:id
 */
export const trackEmailClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { redirect } = req.query;
    
    // Track email click
    await newsletterService.trackEmailClick(parseInt(id, 10));
    
    // Redirect to the specified URL or to the homepage
    res.redirect(redirect as string || process.env.FRONTEND_URL || 'http://localhost:3000');
  } catch (error) {
    logger.error(`Error in trackEmailClick: ${error}`);
    // Redirect even on error
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  }
};

/**
 * Process pending notifications
 * @route POST /api/notifications/process
 */
export const processPendingNotifications = async (req: Request, res: Response) => {
  try {
    // Start processing in the background
    res.status(202).json({ message: 'Processing pending notifications started' });
    
    // Process notifications
    const processedCount = await newsletterService.processPendingNotifications();
    
    logger.info(`Processed ${processedCount} notifications`);
  } catch (error) {
    logger.error(`Error in processPendingNotifications: ${error}`);
    // Response already sent, so no need to send error
  }
};

/**
 * Send weekly newsletter
 * @route POST /api/notifications/weekly-newsletter
 */
export const sendWeeklyNewsletter = async (req: Request, res: Response) => {
  try {
    // Start sending in the background
    res.status(202).json({ message: 'Weekly newsletter sending started' });
    
    // Send weekly newsletter
    const sentCount = await newsletterService.sendWeeklyNewsletter();
    
    logger.info(`Sent weekly newsletter to ${sentCount} users`);
  } catch (error) {
    logger.error(`Error in sendWeeklyNewsletter: ${error}`);
    // Response already sent, so no need to send error
  }
};
