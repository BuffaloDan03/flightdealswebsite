import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { authenticate } from '../../middleware/authenticate';
import { logger } from '../../utils/logger';

/**
 * Get user profile
 * @route GET /api/users/profile
 */
export const getUserProfile = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 */
export const updateUserProfile = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { firstName, lastName } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        updatedAt: new Date()
      }
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error while updating user profile' });
  }
};

/**
 * Get user preferences
 * @route GET /api/users/preferences
 */
export const getUserPreferences = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const preferences = await prisma.userPreference.findUnique({
      where: { userId: user.id }
    });

    if (!preferences) {
      return res.status(404).json({ message: 'Preferences not found' });
    }

    res.status(200).json(preferences);
  } catch (error) {
    logger.error('Get user preferences error:', error);
    res.status(500).json({ message: 'Server error while fetching user preferences' });
  }
};

/**
 * Update user preferences
 * @route PUT /api/users/preferences
 */
export const updateUserPreferences = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const {
      originAirports,
      destinationPreference,
      specificDestinations,
      airlinePreference,
      airlines,
      travelClass,
      premiumEconomy,
      business,
      first,
      minDiscount,
      notificationFrequency
    } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user has premium subscription for certain features
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });

    // Validate premium features
    if (subscription?.planType === 'free') {
      if (destinationPreference === 'specific' || airlinePreference !== 'all' || 
          travelClass === 'premium' || premiumEconomy || business || first) {
        return res.status(403).json({ 
          message: 'Premium subscription required for these preferences',
          requiredPlan: 'premium'
        });
      }
    }

    // Validate premium+ features
    if (subscription?.planType !== 'premium_plus' && (business || first)) {
      return res.status(403).json({ 
        message: 'Premium+ subscription required for business or first class preferences',
        requiredPlan: 'premium_plus'
      });
    }

    const updatedPreferences = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        originAirports,
        destinationPreference,
        specificDestinations,
        airlinePreference,
        airlines,
        travelClass,
        premiumEconomy,
        business,
        first,
        minDiscount,
        notificationFrequency,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        originAirports,
        destinationPreference,
        specificDestinations,
        airlinePreference,
        airlines,
        travelClass,
        premiumEconomy,
        business,
        first,
        minDiscount,
        notificationFrequency
      }
    });

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    logger.error('Update user preferences error:', error);
    res.status(500).json({ message: 'Server error while updating user preferences' });
  }
};
