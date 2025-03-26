import { FlightScraper, ScraperFactory } from './flightScraper';
import { logger } from '../../utils/logger';
import prisma from '../../utils/prisma';
import { PriceHistory } from '@prisma/client';

/**
 * Service for managing flight deal scraping operations
 */
export class ScraperService {
  private scrapers: Map<string, FlightScraper> = new Map();
  
  /**
   * Initialize scrapers
   */
  async initialize(): Promise<void> {
    try {
      // Initialize scrapers for different sources
      const scraperTypes = ['google_flights', 'skyscanner'];
      
      for (const type of scraperTypes) {
        const scraper = ScraperFactory.createScraper(type);
        await scraper.initialize();
        this.scrapers.set(type, scraper);
      }
      
      logger.info('Scraper service initialized');
    } catch (error) {
      logger.error(`Error initializing scraper service: ${error}`);
      throw error;
    }
  }
  
  /**
   * Close all scrapers
   */
  async close(): Promise<void> {
    for (const [type, scraper] of this.scrapers.entries()) {
      await scraper.close();
      logger.info(`Closed ${type} scraper`);
    }
    
    this.scrapers.clear();
    logger.info('Scraper service closed');
  }
  
  /**
   * Scrape flights for a specific route
   */
  async scrapeRoute(origin: string, destination: string, departureDate: Date, returnDate?: Date): Promise<any[]> {
    const allResults: any[] = [];
    
    for (const [type, scraper] of this.scrapers.entries()) {
      try {
        logger.info(`Scraping ${type} for ${origin} to ${destination}`);
        const results = await scraper.scrape(origin, destination, departureDate, returnDate);
        
        // Process and save results
        for (const flight of results) {
          try {
            // Format dates properly
            if (typeof flight.departureTime === 'string') {
              // Parse departure time string to Date
              const departureDate = new Date(departureDate);
              const [hours, minutes] = flight.departureTime.split(':').map(Number);
              departureDate.setHours(hours, minutes, 0, 0);
              flight.departureTime = departureDate;
            }
            
            if (typeof flight.arrivalTime === 'string') {
              // Parse arrival time string to Date
              const arrivalDate = returnDate || departureDate;
              const [hours, minutes] = flight.arrivalTime.split(':').map(Number);
              arrivalDate.setHours(hours, minutes, 0, 0);
              flight.arrivalTime = arrivalDate;
            }
            
            // Parse duration to minutes if it's a string
            if (typeof flight.duration === 'string') {
              const durationMatch = flight.duration.match(/(\d+)h\s*(\d+)m/);
              if (durationMatch) {
                const hours = parseInt(durationMatch[1], 10);
                const minutes = parseInt(durationMatch[2], 10);
                flight.duration = hours * 60 + minutes;
              } else {
                flight.duration = 0;
              }
            }
            
            // Save flight to database
            const savedFlight = await scraper.saveFlightData(flight);
            allResults.push(savedFlight);
            
            // Save to price history
            await this.savePriceHistory(flight);
            
            // Check if this is a deal
            await this.checkForDeal(savedFlight);
          } catch (error) {
            logger.error(`Error processing flight: ${error}`);
          }
        }
      } catch (error) {
        logger.error(`Error scraping ${type}: ${error}`);
      }
    }
    
    return allResults;
  }
  
  /**
   * Save price history
   */
  private async savePriceHistory(flight: any): Promise<void> {
    try {
      await prisma.priceHistory.create({
        data: {
          origin: flight.origin,
          destination: flight.destination,
          airline: flight.airline,
          cabinClass: flight.cabinClass || 'economy',
          price: flight.price,
          currency: flight.currency,
          date: new Date()
        }
      });
    } catch (error) {
      logger.error(`Error saving price history: ${error}`);
    }
  }
  
  /**
   * Check if a flight is a deal
   */
  private async checkForDeal(flight: any): Promise<void> {
    try {
      // Get average price for this route and airline
      const priceHistory = await prisma.priceHistory.findMany({
        where: {
          origin: flight.origin,
          destination: flight.destination,
          airline: flight.airline,
          cabinClass: flight.cabinClass || 'economy',
          date: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        }
      });
      
      if (priceHistory.length === 0) {
        logger.info(`No price history for ${flight.origin} to ${flight.destination} on ${flight.airline}`);
        return;
      }
      
      // Calculate average price
      const totalPrice = priceHistory.reduce((sum, record) => sum + record.price, 0);
      const averagePrice = totalPrice / priceHistory.length;
      
      // Calculate discount percentage
      const discountPercentage = Math.round(((averagePrice - flight.price) / averagePrice) * 100);
      
      // If discount is significant, create a deal
      if (discountPercentage >= 20) {
        let dealQuality = 'good';
        if (discountPercentage >= 30) dealQuality = 'great';
        if (discountPercentage >= 40) dealQuality = 'amazing';
        
        // Check if deal already exists
        const existingDeal = await prisma.deal.findFirst({
          where: { flightId: flight.id }
        });
        
        if (existingDeal) {
          // Update existing deal
          await prisma.deal.update({
            where: { id: existingDeal.id },
            data: {
              regularPrice: averagePrice,
              discountPercentage,
              dealQuality,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            }
          });
          
          logger.info(`Updated deal for ${flight.origin} to ${flight.destination} with ${discountPercentage}% discount`);
        } else {
          // Create new deal
          const deal = await prisma.deal.create({
            data: {
              flightId: flight.id,
              regularPrice: averagePrice,
              discountPercentage,
              dealQuality,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
              featured: discountPercentage >= 30 // Feature deals with at least 30% discount
            }
          });
          
          logger.info(`Created new deal for ${flight.origin} to ${flight.destination} with ${discountPercentage}% discount`);
          
          // Notify users about this deal
          await this.notifyUsersAboutDeal(deal.id);
        }
      }
    } catch (error) {
      logger.error(`Error checking for deal: ${error}`);
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
   * Scrape popular routes
   */
  async scrapePopularRoutes(): Promise<void> {
    try {
      // Get popular airports
      const popularAirports = await prisma.airport.findMany({
        where: { popular: true }
      });
      
      if (popularAirports.length === 0) {
        logger.warn('No popular airports found');
        return;
      }
      
      // Generate departure dates (next 3 months)
      const departureDates: Date[] = [];
      const today = new Date();
      
      for (let i = 14; i <= 90; i += 14) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        departureDates.push(date);
      }
      
      // Scrape routes between popular airports
      for (const origin of popularAirports) {
        for (const destination of popularAirports) {
          // Skip same airport
          if (origin.code === destination.code) continue;
          
          // Scrape for each departure date
          for (const departureDate of departureDates) {
            // Add 7 days for return date
            const returnDate = new Date(departureDate);
            returnDate.setDate(departureDate.getDate() + 7);
            
            await this.scrapeRoute(origin.code, destination.code, departureDate, returnDate);
            
            // Sleep to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      logger.info('Completed scraping popular routes');
    } catch (error) {
      logger.error(`Error scraping popular routes: ${error}`);
    }
  }
}
