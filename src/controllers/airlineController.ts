import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Get airlines with premium filtering options
 * @route GET /api/airlines
 */
export const getAirlines = async (req: Request & { user?: any }, res: Response) => {
  try {
    // Get all airlines
    const airlines = await prisma.airline.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    res.status(200).json(airlines);
  } catch (error) {
    logger.error(`Error in getAirlines: ${error}`);
    res.status(500).json({ message: 'Server error while fetching airlines' });
  }
};

/**
 * Get user's airline preferences
 * @route GET /api/airlines/preferences
 */
export const getAirlinePreferences = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Get user's preferences
    const preferences = await prisma.userPreference.findUnique({
      where: { userId: user.id }
    });
    
    if (!preferences) {
      return res.status(404).json({ message: 'Preferences not found' });
    }
    
    // Get subscription status to determine if user can access premium features
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    const isPremium = subscription && 
                     (subscription.planType === 'premium' || subscription.planType === 'premium_plus') && 
                     (subscription.status === 'active' || subscription.status === 'trialing');
    
    res.status(200).json({
      airlinePreference: preferences.airlinePreference,
      airlines: preferences.airlines,
      isPremium
    });
  } catch (error) {
    logger.error(`Error in getAirlinePreferences: ${error}`);
    res.status(500).json({ message: 'Server error while fetching airline preferences' });
  }
};

/**
 * Update user's airline preferences
 * @route PUT /api/airlines/preferences
 */
export const updateAirlinePreferences = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { airlinePreference, airlines } = req.body;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Validate input
    if (!airlinePreference || !['all', 'specific', 'exclude'].includes(airlinePreference)) {
      return res.status(400).json({ message: 'Invalid airline preference' });
    }
    
    if ((airlinePreference === 'specific' || airlinePreference === 'exclude') && (!airlines || !Array.isArray(airlines))) {
      return res.status(400).json({ message: 'Airlines array is required for specific or exclude preference' });
    }
    
    // Check if user has premium subscription for airline filtering
    if (airlinePreference !== 'all') {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: user.id }
      });
      
      if (!subscription || 
          (subscription.planType !== 'premium' && subscription.planType !== 'premium_plus') || 
          (subscription.status !== 'active' && subscription.status !== 'trialing')) {
        return res.status(403).json({ 
          message: 'Premium subscription required for airline filtering',
          requiredPlan: 'premium',
          upgradeRequired: true
        });
      }
    }
    
    // Update preferences
    const updatedPreferences = await prisma.userPreference.update({
      where: { userId: user.id },
      data: {
        airlinePreference,
        airlines: airlinePreference !== 'all' ? airlines : [],
        updatedAt: new Date()
      }
    });
    
    res.status(200).json({
      message: 'Airline preferences updated successfully',
      preferences: {
        airlinePreference: updatedPreferences.airlinePreference,
        airlines: updatedPreferences.airlines
      }
    });
  } catch (error) {
    logger.error(`Error in updateAirlinePreferences: ${error}`);
    res.status(500).json({ message: 'Server error while updating airline preferences' });
  }
};

/**
 * Get premium cabin class options
 * @route GET /api/airlines/cabin-classes
 */
export const getCabinClasses = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Get user's preferences
    const preferences = await prisma.userPreference.findUnique({
      where: { userId: user.id }
    });
    
    // Get subscription status to determine available cabin classes
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    const isPremium = subscription && 
                     (subscription.planType === 'premium' || subscription.planType === 'premium_plus') && 
                     (subscription.status === 'active' || subscription.status === 'trialing');
    
    const isPremiumPlus = subscription && 
                         subscription.planType === 'premium_plus' && 
                         (subscription.status === 'active' || subscription.status === 'trialing');
    
    // Define available cabin classes based on subscription
    const cabinClasses = [
      {
        id: 'economy',
        name: 'Economy',
        available: true,
        selected: preferences?.travelClass === 'economy'
      },
      {
        id: 'premium_economy',
        name: 'Premium Economy',
        available: isPremium,
        selected: isPremium && preferences?.travelClass === 'premium' && preferences?.premiumEconomy,
        requiresPlan: isPremium ? null : 'premium'
      },
      {
        id: 'business',
        name: 'Business',
        available: isPremiumPlus,
        selected: isPremiumPlus && preferences?.travelClass === 'premium' && preferences?.business,
        requiresPlan: isPremiumPlus ? null : 'premium_plus'
      },
      {
        id: 'first',
        name: 'First Class',
        available: isPremiumPlus,
        selected: isPremiumPlus && preferences?.travelClass === 'premium' && preferences?.first,
        requiresPlan: isPremiumPlus ? null : 'premium_plus'
      }
    ];
    
    res.status(200).json({
      cabinClasses,
      currentPreferences: {
        travelClass: preferences?.travelClass || 'economy',
        premiumEconomy: preferences?.premiumEconomy || false,
        business: preferences?.business || false,
        first: preferences?.first || false
      },
      isPremium,
      isPremiumPlus
    });
  } catch (error) {
    logger.error(`Error in getCabinClasses: ${error}`);
    res.status(500).json({ message: 'Server error while fetching cabin classes' });
  }
};

/**
 * Update user's cabin class preferences
 * @route PUT /api/airlines/cabin-classes
 */
export const updateCabinClassPreferences = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { travelClass, premiumEconomy, business, first } = req.body;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Validate input
    if (!travelClass || !['economy', 'premium'].includes(travelClass)) {
      return res.status(400).json({ message: 'Invalid travel class' });
    }
    
    // Check subscription for premium cabin classes
    if (travelClass === 'premium') {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: user.id }
      });
      
      const isPremium = subscription && 
                       (subscription.planType === 'premium' || subscription.planType === 'premium_plus') && 
                       (subscription.status === 'active' || subscription.status === 'trialing');
      
      const isPremiumPlus = subscription && 
                           subscription.planType === 'premium_plus' && 
                           (subscription.status === 'active' || subscription.status === 'trialing');
      
      if (!isPremium) {
        return res.status(403).json({ 
          message: 'Premium subscription required for premium cabin classes',
          requiredPlan: 'premium',
          upgradeRequired: true
        });
      }
      
      // Check for business and first class access
      if ((business || first) && !isPremiumPlus) {
        return res.status(403).json({ 
          message: 'Premium+ subscription required for business and first class',
          requiredPlan: 'premium_plus',
          upgradeRequired: true
        });
      }
    }
    
    // Update preferences
    const updatedPreferences = await prisma.userPreference.update({
      where: { userId: user.id },
      data: {
        travelClass,
        premiumEconomy: travelClass === 'premium' ? premiumEconomy : false,
        business: travelClass === 'premium' && business ? business : false,
        first: travelClass === 'premium' && first ? first : false,
        updatedAt: new Date()
      }
    });
    
    res.status(200).json({
      message: 'Cabin class preferences updated successfully',
      preferences: {
        travelClass: updatedPreferences.travelClass,
        premiumEconomy: updatedPreferences.premiumEconomy,
        business: updatedPreferences.business,
        first: updatedPreferences.first
      }
    });
  } catch (error) {
    logger.error(`Error in updateCabinClassPreferences: ${error}`);
    res.status(500).json({ message: 'Server error while updating cabin class preferences' });
  }
};
