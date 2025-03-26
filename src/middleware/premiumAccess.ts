import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Middleware to check if user has premium access
 * Only allows access if user has an active premium or premium+ subscription
 */
export const requirePremium = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
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
      return res.status(403).json({ 
        message: 'Premium subscription required',
        requiredPlan: 'premium'
      });
    }
    
    // Check if subscription is active and premium
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return res.status(403).json({ 
        message: 'Active premium subscription required',
        requiredPlan: 'premium'
      });
    }
    
    if (subscription.planType !== 'premium' && subscription.planType !== 'premium_plus') {
      return res.status(403).json({ 
        message: 'Premium subscription required',
        requiredPlan: 'premium'
      });
    }
    
    // User has premium access, proceed
    next();
  } catch (error) {
    logger.error(`Error in requirePremium middleware: ${error}`);
    res.status(500).json({ message: 'Server error while checking premium access' });
  }
};

/**
 * Middleware to check if user has premium+ access
 * Only allows access if user has an active premium+ subscription
 */
export const requirePremiumPlus = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
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
      return res.status(403).json({ 
        message: 'Premium+ subscription required',
        requiredPlan: 'premium_plus'
      });
    }
    
    // Check if subscription is active and premium+
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return res.status(403).json({ 
        message: 'Active premium+ subscription required',
        requiredPlan: 'premium_plus'
      });
    }
    
    if (subscription.planType !== 'premium_plus') {
      return res.status(403).json({ 
        message: 'Premium+ subscription required',
        requiredPlan: 'premium_plus'
      });
    }
    
    // User has premium+ access, proceed
    next();
  } catch (error) {
    logger.error(`Error in requirePremiumPlus middleware: ${error}`);
    res.status(500).json({ message: 'Server error while checking premium+ access' });
  }
};
