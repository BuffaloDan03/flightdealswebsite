import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Get user's tracked destinations
 * @route GET /api/destinations/tracked
 */
export const getTrackedDestinations = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Get user's tracked destinations
    const trackedDestinations = await prisma.trackedDestination.findMany({
      where: { userId: user.id },
      include: {
        airport: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(trackedDestinations);
  } catch (error) {
    logger.error(`Error in getTrackedDestinations: ${error}`);
    res.status(500).json({ message: 'Server error while fetching tracked destinations' });
  }
};

/**
 * Add destination to tracked destinations
 * @route POST /api/destinations/tracked
 */
export const addTrackedDestination = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { airportCode } = req.body;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (!airportCode) {
      return res.status(400).json({ message: 'Airport code is required' });
    }
    
    // Check if user has premium subscription for tracking specific destinations
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    if (!subscription || 
        (subscription.planType !== 'premium' && subscription.planType !== 'premium_plus') || 
        (subscription.status !== 'active' && subscription.status !== 'trialing')) {
      return res.status(403).json({ 
        message: 'Premium subscription required to track specific destinations',
        requiredPlan: 'premium',
        upgradeRequired: true
      });
    }
    
    // Check if airport exists
    const airport = await prisma.airport.findUnique({
      where: { code: airportCode }
    });
    
    if (!airport) {
      return res.status(404).json({ message: 'Airport not found' });
    }
    
    // Check if destination is already tracked
    const existingTrackedDestination = await prisma.trackedDestination.findFirst({
      where: {
        userId: user.id,
        airportCode
      }
    });
    
    if (existingTrackedDestination) {
      return res.status(400).json({ message: 'Destination already tracked' });
    }
    
    // Add destination to tracked destinations
    const trackedDestination = await prisma.trackedDestination.create({
      data: {
        userId: user.id,
        airportCode
      }
    });
    
    res.status(201).json({
      message: 'Destination added to tracked destinations',
      trackedDestination
    });
  } catch (error) {
    logger.error(`Error in addTrackedDestination: ${error}`);
    res.status(500).json({ message: 'Server error while adding tracked destination' });
  }
};

/**
 * Remove destination from tracked destinations
 * @route DELETE /api/destinations/tracked/:id
 */
export const removeTrackedDestination = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Check if tracked destination exists and belongs to user
    const trackedDestination = await prisma.trackedDestination.findFirst({
      where: {
        id: parseInt(id, 10),
        userId: user.id
      }
    });
    
    if (!trackedDestination) {
      return res.status(404).json({ message: 'Tracked destination not found' });
    }
    
    // Remove destination from tracked destinations
    await prisma.trackedDestination.delete({
      where: { id: trackedDestination.id }
    });
    
    res.status(200).json({ message: 'Destination removed from tracked destinations' });
  } catch (error) {
    logger.error(`Error in removeTrackedDestination: ${error}`);
    res.status(500).json({ message: 'Server error while removing tracked destination' });
  }
};

/**
 * Get premium destination suggestions
 * @route GET /api/destinations/suggestions
 */
export const getDestinationSuggestions = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Check if user has premium subscription for destination suggestions
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    if (!subscription || 
        (subscription.planType !== 'premium' && subscription.planType !== 'premium_plus') || 
        (subscription.status !== 'active' && subscription.status !== 'trialing')) {
      return res.status(403).json({ 
        message: 'Premium subscription required for destination suggestions',
        requiredPlan: 'premium',
        upgradeRequired: true
      });
    }
    
    // Get user's preferences
    const preferences = await prisma.userPreference.findUnique({
      where: { userId: user.id }
    });
    
    // Get user's tracked destinations
    const trackedDestinations = await prisma.trackedDestination.findMany({
      where: { userId: user.id },
      select: { airportCode: true }
    });
    
    const trackedCodes = trackedDestinations.map(td => td.airportCode);
    
    // Get popular destinations not already tracked by user
    const popularDestinations = await prisma.airport.findMany({
      where: {
        popular: true,
        code: {
          notIn: trackedCodes
        }
      },
      take: 5
    });
    
    // Get destinations with active deals
    const dealsDestinations = await prisma.deal.findMany({
      where: {
        expiresAt: {
          gt: new Date()
        },
        discountPercentage: {
          gte: 25
        },
        flight: {
          origin: preferences?.originAirports ? {
            in: preferences.originAirports as string[]
          } : undefined,
          destination: {
            notIn: trackedCodes
          }
        }
      },
      include: {
        flight: {
          include: {
            destinationAirport: true
          }
        }
      },
      distinct: ['flight.destination'],
      take: 5
    });
    
    // Format deals destinations
    const dealsSuggestions = dealsDestinations.map(deal => ({
      code: deal.flight.destination,
      city: deal.flight.destinationAirport.city,
      country: deal.flight.destinationAirport.country,
      dealDiscount: deal.discountPercentage,
      dealId: deal.id
    }));
    
    res.status(200).json({
      popular: popularDestinations,
      deals: dealsSuggestions
    });
  } catch (error) {
    logger.error(`Error in getDestinationSuggestions: ${error}`);
    res.status(500).json({ message: 'Server error while fetching destination suggestions' });
  }
};
