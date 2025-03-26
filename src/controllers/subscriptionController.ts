import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import config from '../config';

// Initialize Stripe
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

/**
 * Get subscription plans
 * @route GET /api/subscriptions/plans
 */
export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    // Get plans from database or define them here
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        features: [
          'Access to popular flight deals',
          'Weekly newsletter',
          'Basic email notifications',
          'Limited to popular destinations'
        ],
        limitations: [
          'No custom airport selection',
          'No airline filtering',
          'Economy class deals only',
          'Limited to 20% discount deals'
        ]
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 9.99,
        interval: 'month',
        features: [
          'All Free features',
          'Custom airport selection',
          'Airline filtering',
          'Premium Economy class deals',
          'Access to all deals (any discount)',
          'Daily deal alerts',
          'Early access to deals'
        ],
        limitations: [
          'No Business or First class deals'
        ],
        stripePriceId: config.stripe.premiumPriceId
      },
      {
        id: 'premium_plus',
        name: 'Premium+',
        price: 19.99,
        interval: 'month',
        features: [
          'All Premium features',
          'Business and First class deals',
          'Priority notifications',
          'Personalized deal recommendations',
          'Price prediction alerts',
          'Dedicated support'
        ],
        limitations: [],
        stripePriceId: config.stripe.premiumPlusPriceId
      }
    ];
    
    res.status(200).json(plans);
  } catch (error) {
    logger.error(`Error in getSubscriptionPlans: ${error}`);
    res.status(500).json({ message: 'Server error while fetching subscription plans' });
  }
};

/**
 * Get user subscription
 * @route GET /api/subscriptions/current
 */
export const getCurrentSubscription = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    res.status(200).json(subscription);
  } catch (error) {
    logger.error(`Error in getCurrentSubscription: ${error}`);
    res.status(500).json({ message: 'Server error while fetching subscription' });
  }
};

/**
 * Create checkout session
 * @route POST /api/subscriptions/create-checkout-session
 */
export const createCheckoutSession = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { planId } = req.body;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }
    
    // Get plan details
    let stripePriceId;
    if (planId === 'premium') {
      stripePriceId = config.stripe.premiumPriceId;
    } else if (planId === 'premium_plus') {
      stripePriceId = config.stripe.premiumPlusPriceId;
    } else {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancel`,
      customer_email: user.email,
      client_reference_id: user.id.toString(),
      metadata: {
        userId: user.id.toString(),
        planId
      }
    });
    
    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error(`Error in createCheckoutSession: ${error}`);
    res.status(500).json({ message: 'Server error while creating checkout session' });
  }
};

/**
 * Handle webhook events from Stripe
 * @route POST /api/subscriptions/webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      return res.status(400).json({ message: 'Missing stripe-signature header' });
    }
    
    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err}`);
      return res.status(400).json({ message: 'Webhook signature verification failed' });
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Error in handleWebhook: ${error}`);
    res.status(500).json({ message: 'Server error while handling webhook' });
  }
};

/**
 * Handle checkout.session.completed event
 */
const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session) => {
  try {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    
    if (!userId || !planId) {
      logger.error('Missing userId or planId in session metadata');
      return;
    }
    
    // Get subscription details from Stripe
    const subscriptionId = session.subscription as string;
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update or create subscription in database
    await prisma.subscription.upsert({
      where: { userId: parseInt(userId, 10) },
      update: {
        planType: planId,
        status: 'active',
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: stripeSubscription.customer as string,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        updatedAt: new Date()
      },
      create: {
        userId: parseInt(userId, 10),
        planType: planId,
        status: 'active',
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: stripeSubscription.customer as string,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
      }
    });
    
    logger.info(`Subscription created/updated for user ${userId} with plan ${planId}`);
  } catch (error) {
    logger.error(`Error handling checkout.session.completed: ${error}`);
  }
};

/**
 * Handle customer.subscription.updated event
 */
const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  try {
    // Find subscription in database by Stripe subscription ID
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    });
    
    if (!dbSubscription) {
      logger.error(`Subscription not found for Stripe subscription ID: ${subscription.id}`);
      return;
    }
    
    // Determine plan type based on price ID
    let planType = dbSubscription.planType;
    const priceId = subscription.items.data[0].price.id;
    
    if (priceId === config.stripe.premiumPriceId) {
      planType = 'premium';
    } else if (priceId === config.stripe.premiumPlusPriceId) {
      planType = 'premium_plus';
    }
    
    // Determine subscription status
    let status = 'active';
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      status = 'past_due';
    } else if (subscription.status === 'canceled') {
      status = 'canceled';
    } else if (subscription.status === 'trialing') {
      status = 'trialing';
    }
    
    // Update subscription in database
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        planType,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date()
      }
    });
    
    logger.info(`Subscription updated for user ${dbSubscription.userId} with status ${status}`);
  } catch (error) {
    logger.error(`Error handling customer.subscription.updated: ${error}`);
  }
};

/**
 * Handle customer.subscription.deleted event
 */
const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  try {
    // Find subscription in database by Stripe subscription ID
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    });
    
    if (!dbSubscription) {
      logger.error(`Subscription not found for Stripe subscription ID: ${subscription.id}`);
      return;
    }
    
    // Update subscription in database
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'canceled',
        planType: 'free',
        updatedAt: new Date()
      }
    });
    
    logger.info(`Subscription canceled for user ${dbSubscription.userId}`);
  } catch (error) {
    logger.error(`Error handling customer.subscription.deleted: ${error}`);
  }
};

/**
 * Cancel subscription
 * @route POST /api/subscriptions/cancel
 */
export const cancelSubscription = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return res.status(400).json({ message: 'Subscription is not active' });
    }
    
    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No Stripe subscription ID found' });
    }
    
    // Cancel subscription in Stripe
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    
    // Update subscription in database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'canceled',
        updatedAt: new Date()
      }
    });
    
    res.status(200).json({ message: 'Subscription canceled successfully' });
  } catch (error) {
    logger.error(`Error in cancelSubscription: ${error}`);
    res.status(500).json({ message: 'Server error while canceling subscription' });
  }
};

/**
 * Check feature access
 * @route GET /api/subscriptions/check-access/:feature
 */
export const checkFeatureAccess = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { feature } = req.params;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Check if subscription is active
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return res.status(200).json({ hasAccess: false, requiredPlan: 'premium' });
    }
    
    // Check feature access based on plan type
    let hasAccess = false;
    let requiredPlan = 'premium';
    
    switch (feature) {
      case 'specific_airports':
      case 'airline_filtering':
      case 'premium_economy':
        hasAccess = subscription.planType === 'premium' || subscription.planType === 'premium_plus';
        break;
      case 'business_class':
      case 'first_class':
        hasAccess = subscription.planType === 'premium_plus';
        requiredPlan = 'premium_plus';
        break;
      case 'basic_deals':
        hasAccess = true; // All users have access to basic deals
        break;
      default:
        return res.status(400).json({ message: 'Invalid feature' });
    }
    
    res.status(200).json({ hasAccess, requiredPlan });
  } catch (error) {
    logger.error(`Error in checkFeatureAccess: ${error}`);
    res.status(500).json({ message: 'Server error while checking feature access' });
  }
};
