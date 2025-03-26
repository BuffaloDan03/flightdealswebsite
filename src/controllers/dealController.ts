import { Request, Response } from 'express';
import { DealDetectionService } from '../services/deals/dealDetectionService';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

// Initialize deal detection service
const dealDetectionService = new DealDetectionService();

/**
 * Get all deals
 * @route GET /api/deals
 */
export const getAllDeals = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', origin, destination, airline, minDiscount } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter conditions
    const where: any = {
      expiresAt: {
        gt: new Date()
      }
    };
    
    if (origin) {
      where.flight = {
        ...where.flight,
        origin: origin as string
      };
    }
    
    if (destination) {
      where.flight = {
        ...where.flight,
        destination: destination as string
      };
    }
    
    if (airline) {
      where.flight = {
        ...where.flight,
        airline: airline as string
      };
    }
    
    if (minDiscount) {
      where.discountPercentage = {
        gte: parseInt(minDiscount as string, 10)
      };
    }
    
    // Get deals with pagination
    const deals = await prisma.deal.findMany({
      where,
      include: {
        flight: {
          include: {
            originAirport: true,
            destinationAirport: true,
            airlineInfo: true
          }
        }
      },
      orderBy: {
        discountPercentage: 'desc'
      },
      skip,
      take: limitNum
    });
    
    // Get total count for pagination
    const totalDeals = await prisma.deal.count({ where });
    
    res.status(200).json({
      deals,
      pagination: {
        total: totalDeals,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalDeals / limitNum)
      }
    });
  } catch (error) {
    logger.error(`Error in getAllDeals: ${error}`);
    res.status(500).json({ message: 'Server error while fetching deals' });
  }
};

/**
 * Get deal by ID
 * @route GET /api/deals/:id
 */
export const getDealById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const deal = await prisma.deal.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        flight: {
          include: {
            originAirport: true,
            destinationAirport: true,
            airlineInfo: true
          }
        }
      }
    });
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    res.status(200).json(deal);
  } catch (error) {
    logger.error(`Error in getDealById: ${error}`);
    res.status(500).json({ message: 'Server error while fetching deal' });
  }
};

/**
 * Get featured deals
 * @route GET /api/deals/featured
 */
export const getFeaturedDeals = async (req: Request, res: Response) => {
  try {
    const { limit = '6' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    
    const featuredDeals = await prisma.deal.findMany({
      where: {
        featured: true,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        flight: {
          include: {
            originAirport: true,
            destinationAirport: true,
            airlineInfo: true
          }
        }
      },
      orderBy: {
        discountPercentage: 'desc'
      },
      take: limitNum
    });
    
    res.status(200).json(featuredDeals);
  } catch (error) {
    logger.error(`Error in getFeaturedDeals: ${error}`);
    res.status(500).json({ message: 'Server error while fetching featured deals' });
  }
};

/**
 * Search deals
 * @route GET /api/deals/search
 */
export const searchDeals = async (req: Request, res: Response) => {
  try {
    const { 
      origin, 
      destination, 
      departureDate, 
      returnDate, 
      airline, 
      cabinClass,
      minDiscount = '20',
      page = '1', 
      limit = '10' 
    } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter conditions
    const where: any = {
      expiresAt: {
        gt: new Date()
      },
      discountPercentage: {
        gte: parseInt(minDiscount as string, 10)
      }
    };
    
    // Add flight conditions
    const flightWhere: any = {};
    
    if (origin) flightWhere.origin = origin as string;
    if (destination) flightWhere.destination = destination as string;
    if (airline) flightWhere.airline = airline as string;
    if (cabinClass) flightWhere.cabinClass = cabinClass as string;
    
    if (departureDate) {
      const depDate = new Date(departureDate as string);
      const nextDay = new Date(depDate);
      nextDay.setDate(depDate.getDate() + 1);
      
      flightWhere.departureTime = {
        gte: depDate,
        lt: nextDay
      };
    }
    
    if (Object.keys(flightWhere).length > 0) {
      where.flight = flightWhere;
    }
    
    // Get deals with pagination
    const deals = await prisma.deal.findMany({
      where,
      include: {
        flight: {
          include: {
            originAirport: true,
            destinationAirport: true,
            airlineInfo: true
          }
        }
      },
      orderBy: {
        discountPercentage: 'desc'
      },
      skip,
      take: limitNum
    });
    
    // Get total count for pagination
    const totalDeals = await prisma.deal.count({ where });
    
    res.status(200).json({
      deals,
      pagination: {
        total: totalDeals,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalDeals / limitNum)
      }
    });
  } catch (error) {
    logger.error(`Error in searchDeals: ${error}`);
    res.status(500).json({ message: 'Server error while searching deals' });
  }
};

/**
 * Trigger deal analysis for a specific flight
 * @route POST /api/deals/analyze/:flightId
 */
export const analyzeFlight = async (req: Request, res: Response) => {
  try {
    const { flightId } = req.params;
    
    // Start analysis in the background
    res.status(202).json({ message: 'Deal analysis started' });
    
    // Perform analysis
    const dealInfo = await dealDetectionService.analyzeFlightPrice(parseInt(flightId, 10));
    
    logger.info(`Completed deal analysis for flight #${flightId}: ${dealInfo ? 'Deal found' : 'No deal'}`);
  } catch (error) {
    logger.error(`Error in analyzeFlight: ${error}`);
    // Response already sent, so no need to send error
  }
};

/**
 * Trigger deal analysis for all recent flights
 * @route POST /api/deals/analyze-recent
 */
export const analyzeRecentFlights = async (req: Request, res: Response) => {
  try {
    // Start analysis in the background
    res.status(202).json({ message: 'Analysis of recent flights started' });
    
    // Perform analysis
    await dealDetectionService.analyzeRecentFlights();
    
    logger.info('Completed analysis of recent flights');
  } catch (error) {
    logger.error(`Error in analyzeRecentFlights: ${error}`);
    // Response already sent, so no need to send error
  }
};

/**
 * Re-evaluate existing deals
 * @route POST /api/deals/reevaluate
 */
export const reevaluateDeals = async (req: Request, res: Response) => {
  try {
    // Start re-evaluation in the background
    res.status(202).json({ message: 'Deal re-evaluation started' });
    
    // Perform re-evaluation
    await dealDetectionService.reevaluateExistingDeals();
    
    logger.info('Completed re-evaluation of existing deals');
  } catch (error) {
    logger.error(`Error in reevaluateDeals: ${error}`);
    // Response already sent, so no need to send error
  }
};
