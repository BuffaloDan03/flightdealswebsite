import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  trackEmailOpen, 
  trackEmailClick,
  processPendingNotifications,
  sendWeeklyNewsletter
} from '../controllers/notificationController';

// Notification routes
const router = Router();

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authenticate, getUserNotifications);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticate, markNotificationAsRead);

/**
 * @route   GET /api/notifications/track/open/:id
 * @desc    Track email open
 * @access  Public
 */
router.get('/track/open/:id', trackEmailOpen);

/**
 * @route   GET /api/notifications/track/click/:id
 * @desc    Track email click
 * @access  Public
 */
router.get('/track/click/:id', trackEmailClick);

/**
 * @route   POST /api/notifications/process
 * @desc    Process pending notifications
 * @access  Private (Admin only)
 */
router.post('/process', authenticate, processPendingNotifications);

/**
 * @route   POST /api/notifications/weekly-newsletter
 * @desc    Send weekly newsletter
 * @access  Private (Admin only)
 */
router.post('/weekly-newsletter', authenticate, sendWeeklyNewsletter);

export default router;
