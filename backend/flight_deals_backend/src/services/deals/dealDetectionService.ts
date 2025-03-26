import prisma from '../../utils/prisma';
import { logger } from '../../utils/logger';

/**
 * Service for detecting and managing flight deals
 */
export class DealDetectionService {
  /**
   * Analyze flight prices and detect deals
   * @param flightId ID of the flight to analyze
   */
  async analyzeFlightPrice(flightId: number): Promise<any> {
    try {
      // Get flight details
      const flight = await prisma.flight.findUnique({
        where: { id: flightId },
        include: {
          originAirport: true,
          destinationAirport: true,
          airlineInfo: true
        }
      });

      if (!flight) {
        logger.error(`Flight not found: ${flightId}`);
        return null;
      }

      // Get historical prices for this route and airline
      const priceHistory = await this.getHistoricalPrices(
        flight.origin,
        flight.destination,
        flight.airline,
        flight.cabinClass
      );

      // Calculate price statistics
      const priceStats = this.calculatePriceStatistics(priceHistory);
      
      // Determine if this is a deal
      const dealInfo = this.evaluateDeal(flight.price, priceStats);
      
      if (dealInfo.isDeal) {
        // Create or update deal
        await this.createOrUpdateDeal(flight, dealInfo, priceStats.averagePrice);
        return dealInfo;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error analyzing flight price: ${error}`);
      throw error;
    }
  }

  /**
   * Get historical prices for a route
   */
  private async getHistoricalPrices(
    origin: string,
    destination: string,
    airline: string,
    cabinClass: string
  ): Promise<any[]> {
    try {
      // Get price history for the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const priceHistory = await prisma.priceHistory.findMany({
        where: {
          origin,
          destination,
          airline,
          cabinClass,
          date: {
            gte: ninetyDaysAgo
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      return priceHistory;
    } catch (error) {
      logger.error(`Error getting historical prices: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate price statistics from historical data
   */
  private calculatePriceStatistics(priceHistory: any[]): any {
    if (priceHistory.length === 0) {
      return {
        averagePrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        standardDeviation: 0,
        priceVolatility: 'unknown'
      };
    }

    // Calculate average price
    const totalPrice = priceHistory.reduce((sum, record) => sum + record.price, 0);
    const averagePrice = totalPrice / priceHistory.length;

    // Calculate median price
    const sortedPrices = [...priceHistory].sort((a, b) => a.price - b.price);
    const midIndex = Math.floor(sortedPrices.length / 2);
    const medianPrice = sortedPrices.length % 2 === 0
      ? (sortedPrices[midIndex - 1].price + sortedPrices[midIndex].price) / 2
      : sortedPrices[midIndex].price;

    // Calculate min and max prices
    const minPrice = sortedPrices[0].price;
    const maxPrice = sortedPrices[sortedPrices.length - 1].price;

    // Calculate standard deviation
    const squaredDifferences = priceHistory.map(record => 
      Math.pow(record.price - averagePrice, 2)
    );
    const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / priceHistory.length;
    const standardDeviation = Math.sqrt(variance);

    // Determine price volatility
    const volatilityRatio = standardDeviation / averagePrice;
    let priceVolatility = 'low';
    if (volatilityRatio > 0.2) priceVolatility = 'high';
    else if (volatilityRatio > 0.1) priceVolatility = 'medium';

    // Detect seasonal trends
    const seasonalTrend = this.detectSeasonalTrend(priceHistory);

    return {
      averagePrice,
      medianPrice,
      minPrice,
      maxPrice,
      standardDeviation,
      priceVolatility,
      seasonalTrend
    };
  }

  /**
   * Detect seasonal trends in price history
   */
  private detectSeasonalTrend(priceHistory: any[]): string {
    if (priceHistory.length < 30) {
      return 'insufficient_data';
    }

    // Group prices by month
    const pricesByMonth: { [key: string]: number[] } = {};
    
    priceHistory.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!pricesByMonth[monthKey]) {
        pricesByMonth[monthKey] = [];
      }
      
      pricesByMonth[monthKey].push(record.price);
    });

    // Calculate average price per month
    const monthlyAverages: { month: string, average: number }[] = [];
    
    for (const [month, prices] of Object.entries(pricesByMonth)) {
      const total = prices.reduce((sum, price) => sum + price, 0);
      monthlyAverages.push({
        month,
        average: total / prices.length
      });
    }

    // Sort by month
    monthlyAverages.sort((a, b) => a.month.localeCompare(b.month));

    // Check if prices are trending up or down
    if (monthlyAverages.length < 2) {
      return 'insufficient_data';
    }

    const firstMonth = monthlyAverages[0].average;
    const lastMonth = monthlyAverages[monthlyAverages.length - 1].average;
    
    const percentChange = ((lastMonth - firstMonth) / firstMonth) * 100;
    
    if (percentChange > 10) {
      return 'increasing';
    } else if (percentChange < -10) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Evaluate if a price qualifies as a deal
   */
  private evaluateDeal(currentPrice: number, priceStats: any): any {
    // If no historical data, can't determine if it's a deal
    if (priceStats.averagePrice === 0) {
      return { isDeal: false };
    }

    // Calculate discount percentage
    const discountPercentage = Math.round(
      ((priceStats.averagePrice - currentPrice) / priceStats.averagePrice) * 100
    );

    // Determine if it's a deal based on discount percentage
    let isDeal = false;
    let dealQuality = '';
    
    if (discountPercentage >= 40) {
      isDeal = true;
      dealQuality = 'amazing';
    } else if (discountPercentage >= 30) {
      isDeal = true;
      dealQuality = 'great';
    } else if (discountPercentage >= 20) {
      isDeal = true;
      dealQuality = 'good';
    }

    // Adjust deal quality based on price volatility
    if (isDeal && priceStats.priceVolatility === 'high') {
      // Downgrade deal quality for highly volatile routes
      if (dealQuality === 'amazing') dealQuality = 'great';
      else if (dealQuality === 'great') dealQuality = 'good';
    }

    // Adjust deal quality based on seasonal trends
    if (isDeal && priceStats.seasonalTrend === 'decreasing') {
      // Downgrade deal quality for routes with decreasing price trends
      if (dealQuality === 'amazing') dealQuality = 'great';
      else if (dealQuality === 'great') dealQuality = 'good';
    }

    return {
      isDeal,
      discountPercentage,
      dealQuality,
      comparedToAverage: priceStats.averagePrice,
      comparedToMedian: priceStats.medianPrice,
      priceVolatility: priceStats.priceVolatility,
      seasonalTrend: priceStats.seasonalTrend
    };
  }

  /**
   * Create or update a deal in the database
   */
  private async createOrUpdateDeal(flight: any, dealInfo: any, regularPrice: number): Promise<any> {
    try {
      // Check if deal already exists
      const existingDeal = await prisma.deal.findFirst({
        where: { flightId: flight.id }
      });

      // Set expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Determine if deal should be featured
      const featured = dealInfo.dealQuality === 'amazing' || 
                      (dealInfo.dealQuality === 'great' && 
                       dealInfo.discountPercentage >= 35);

      if (existingDeal) {
        // Update existing deal
        const updatedDeal = await prisma.deal.update({
          where: { id: existingDeal.id },
          data: {
            regularPrice,
            discountPercentage: dealInfo.discountPercentage,
            dealQuality: dealInfo.dealQuality,
            expiresAt,
            featured
          }
        });

        logger.info(`Updated deal #${updatedDeal.id} for flight #${flight.id} with ${dealInfo.discountPercentage}% discount`);
        return updatedDeal;
      } else {
        // Create new deal
        const newDeal = await prisma.deal.create({
          data: {
            flightId: flight.id,
            regularPrice,
            discountPercentage: dealInfo.discountPercentage,
            dealQuality: dealInfo.dealQuality,
            expiresAt,
            featured
          }
        });

        logger.info(`Created new deal #${newDeal.id} for flight #${flight.id} with ${dealInfo.discountPercentage}% discount`);
        
        // Notify users about this deal
        await this.notifyUsersAboutDeal(newDeal.id);
        
        return newDeal;
      }
    } catch (error) {
      logger.error(`Error creating/updating deal: ${error}`);
      throw error;
    }
  }

  /**
   * Notify users about a new deal
   */
  private async notifyUsersAboutDeal(dealId: number): Promise<void> {
    try {
      // Get deal details
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
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
        logger.error(`Deal not found: ${dealId}`);
        return;
      }

      // Find users who should be notified about this deal
      const users = await prisma.user.findMany({
        where: {
          subscription: {
            status: 'active'
          },
          preferences: {
            OR: [
              // Free users with any destination
              {
                destinationPreference: 'all'
              },
              // Premium users with specific destinations
              {
                destinationPreference: 'specific',
                specificDestinations: {
                  array_contains: [deal.flight.destination]
                }
              }
            ],
            // Match origin airports if specified
            OR: [
              {
                originAirports: { equals: [] }
              },
              {
                originAirports: {
                  array_contains: [deal.flight.origin]
                }
              }
            ],
            // Match airline preference
            OR: [
              {
                airlinePreference: 'all'
              },
              {
                airlinePreference: 'specific',
                airlines: {
                  array_contains: [deal.flight.airline]
                }
              },
              {
                airlinePreference: 'exclude',
                airlines: {
                  not: {
                    array_contains: [deal.flight.airline]
                  }
                }
              }
            ],
            // Match cabin class preference
            OR: [
              // Economy class for all users
              {
                travelClass: 'economy',
                AND: {
                  flight: {
                    cabinClass: 'economy'
                  }
                }
              },
              // Premium cabins for premium+ users
              {
                travelClass: 'premium',
                OR: [
                  {
                    premiumEconomy: true,
                    AND: {
                      flight: {
                        cabinClass: 'premium_economy'
                      }
                    }
                  },
                  {
                    business: true,
                    AND: {
                      flight: {
                        cabinClass: 'business'
                      }
                    }
                  },
                  {
                    first: true,
                    AND: {
                      flight: {
                        cabinClass: 'first'
                      }
                    }
                  }
                ]
              }
            ],
            // Match minimum discount
            minDiscount: {
              lte: deal.discountPercentage
            }
          }
        },
        include: {
          preferences: true
        }
      });

      logger.info(`Found ${users.length} users to notify about deal ${dealId}`);

      // Create notifications for each user
      for (const user of users) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            dealId: deal.id,
            status: 'pending'
          }
        });
      }

      logger.info(`Created ${users.length} notifications for deal ${dealId}`);
    } catch (error) {
      logger.error(`Error notifying users about deal: ${error}`);
    }
  }

  /**
   * Analyze all recent flights for deals
   */
  async analyzeRecentFlights(): Promise<void> {
    try {
      // Get flights from the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const recentFlights = await prisma.flight.findMany({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      });

      logger.info(`Analyzing ${recentFlights.length} recent flights for deals`);

      // Analyze each flight
      for (const flight of recentFlights) {
        await this.analyzeFlightPrice(flight.id);
      }

      logger.info('Completed analysis of recent flights');
    } catch (error) {
      logger.error(`Error analyzing recent flights: ${error}`);
    }
  }

  /**
   * Re-evaluate existing deals
   */
  async reevaluateExistingDeals(): Promise<void> {
    try {
      // Get all active deals
      const activeDeals = await prisma.deal.findMany({
        where: {
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          flight: true
        }
      });

      logger.info(`Re-evaluating ${activeDeals.length} existing deals`);

      // Re-analyze each flight
      for (const deal of activeDeals) {
        await this.analyzeFlightPrice(deal.flight.id);
      }

      logger.info('Completed re-evaluation of existing deals');
    } catch (error) {
      logger.error(`Error re-evaluating existing deals: ${error}`);
    }
  }
}
