import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { 
  getSubscriptionPlans, 
  getCurrentSubscription, 
  createCheckoutSession, 
  handleWebhook, 
  cancelSubscription,
  checkFeatureAccess
} from '../controllers/subscriptionController';

// Subscription routes
const router = Router();

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get subscription plans
 * @access  Public
 */
router.get('/plans', getSubscriptionPlans);

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get current subscription
 * @access  Private
 */
router.get('/current', authenticate, getCurrentSubscription);

/**
 * @route   POST /api/subscriptions/create-checkout-session
 * @desc    Create checkout session
 * @access  Private
 */
router.post('/create-checkout-session', authenticate, createCheckoutSession);

/**
 * @route   POST /api/subscriptions/webhook
 * @desc    Handle webhook events from Stripe
 * @access  Public
 */
router.post('/webhook', handleWebhook);

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/cancel', authenticate, cancelSubscription);

/**
 * @route   GET /api/subscriptions/check-access/:feature
 * @desc    Check feature access
 * @access  Private
 */
router.get('/check-access/:feature', authenticate, checkFeatureAccess);

export default router;
