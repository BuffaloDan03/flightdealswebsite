import puppeteer from 'puppeteer';
import { logger } from '../../utils/logger';
import prisma from '../../utils/prisma';

/**
 * Base class for flight scrapers
 */
export abstract class FlightScraper {
  protected browser: puppeteer.Browser | null = null;
  
  /**
   * Initialize the scraper
   */
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    logger.info(`${this.constructor.name} initialized`);
  }
  
  /**
   * Close the scraper
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info(`${this.constructor.name} closed`);
    }
  }
  
  /**
   * Scrape flight data
   */
  abstract scrape(origin: string, destination: string, departureDate: Date, returnDate?: Date): Promise<any>;
  
  /**
   * Save flight data to database
   */
  async saveFlightData(flightData: any): Promise<any> {
    try {
      // Check if flight already exists
      const existingFlight = await prisma.flight.findFirst({
        where: {
          origin: flightData.origin,
          destination: flightData.destination,
          airline: flightData.airline,
          flightNumber: flightData.flightNumber,
          departureTime: flightData.departureTime,
          arrivalTime: flightData.arrivalTime,
          cabinClass: flightData.cabinClass
        }
      });
      
      if (existingFlight) {
        // Update existing flight
        return await prisma.flight.update({
          where: { id: existingFlight.id },
          data: {
            price: flightData.price,
            currency: flightData.currency,
            source: flightData.source,
            sourceUrl: flightData.sourceUrl
          }
        });
      } else {
        // Create new flight
        return await prisma.flight.create({
          data: flightData
        });
      }
    } catch (error) {
      logger.error(`Error saving flight data: ${error}`);
      throw error;
    }
  }
}

/**
 * Scraper for Google Flights
 */
export class GoogleFlightsScraper extends FlightScraper {
  async scrape(origin: string, destination: string, departureDate: Date, returnDate?: Date): Promise<any> {
    if (!this.browser) {
      await this.initialize();
    }
    
    try {
      const page = await this.browser!.newPage();
      
      // Format dates
      const departureDateStr = departureDate.toISOString().split('T')[0];
      const returnDateStr = returnDate ? returnDate.toISOString().split('T')[0] : '';
      
      // Construct Google Flights URL
      let url = `https://www.google.com/travel/flights?q=Flights%20to%20${destination}%20from%20${origin}%20on%20${departureDateStr}`;
      if (returnDate) {
        url += `%20returning%20${returnDateStr}`;
      }
      
      logger.info(`Scraping Google Flights: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for results to load
      await page.waitForSelector('.gws-flights-results__result-item', { timeout: 30000 });
      
      // Extract flight data
      const flights = await page.evaluate(() => {
        const results: any[] = [];
        const flightElements = document.querySelectorAll('.gws-flights-results__result-item');
        
        flightElements.forEach((element) => {
          try {
            const airline = element.querySelector('.gws-flights-results__carriers')?.textContent?.trim() || '';
            const flightNumber = element.querySelector('.gws-flights-results__other-flights')?.textContent?.trim() || '';
            const price = element.querySelector('.gws-flights-results__price')?.textContent?.trim() || '';
            const duration = element.querySelector('.gws-flights-results__duration')?.textContent?.trim() || '';
            const departureTime = element.querySelector('.gws-flights-results__departure-time')?.textContent?.trim() || '';
            const arrivalTime = element.querySelector('.gws-flights-results__arrival-time')?.textContent?.trim() || '';
            
            // Parse price
            const priceMatch = price.match(/\d+/);
            const priceValue = priceMatch ? parseInt(priceMatch[0], 10) : 0;
            
            results.push({
              airline,
              flightNumber,
              price: priceValue,
              currency: 'USD', // Assuming USD
              duration,
              departureTime,
              arrivalTime
            });
          } catch (error) {
            console.error('Error parsing flight element:', error);
          }
        });
        
        return results;
      });
      
      await page.close();
      
      logger.info(`Found ${flights.length} flights from Google Flights`);
      
      return flights.map(flight => ({
        ...flight,
        origin,
        destination,
        source: 'google_flights',
        sourceUrl: url
      }));
    } catch (error) {
      logger.error(`Error scraping Google Flights: ${error}`);
      throw error;
    }
  }
}

/**
 * Scraper for Skyscanner
 */
export class SkyscannerScraper extends FlightScraper {
  async scrape(origin: string, destination: string, departureDate: Date, returnDate?: Date): Promise<any> {
    if (!this.browser) {
      await this.initialize();
    }
    
    try {
      const page = await this.browser!.newPage();
      
      // Format dates
      const departureDateStr = departureDate.toISOString().split('T')[0];
      const returnDateStr = returnDate ? returnDate.toISOString().split('T')[0] : '';
      
      // Construct Skyscanner URL
      let url = `https://www.skyscanner.com/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${departureDateStr}/`;
      if (returnDate) {
        url += `${returnDateStr}/`;
      }
      
      logger.info(`Scraping Skyscanner: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Accept cookies if prompted
      try {
        const acceptCookiesButton = await page.$('[data-testid="acceptCookieButton"]');
        if (acceptCookiesButton) {
          await acceptCookiesButton.click();
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        logger.warn('No cookie banner found or error accepting cookies');
      }
      
      // Wait for results to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 30000 });
      
      // Extract flight data
      const flights = await page.evaluate(() => {
        const results: any[] = [];
        const flightCards = document.querySelectorAll('[data-testid="flight-card"]');
        
        flightCards.forEach((card) => {
          try {
            const priceElement = card.querySelector('[data-testid="price"]');
            const price = priceElement ? priceElement.textContent : '';
            
            const airlineElement = card.querySelector('[data-testid="carrier"]');
            const airline = airlineElement ? airlineElement.textContent : '';
            
            const departureTimeElement = card.querySelector('[data-testid="departure-time"]');
            const departureTime = departureTimeElement ? departureTimeElement.textContent : '';
            
            const arrivalTimeElement = card.querySelector('[data-testid="arrival-time"]');
            const arrivalTime = arrivalTimeElement ? arrivalTimeElement.textContent : '';
            
            const durationElement = card.querySelector('[data-testid="duration"]');
            const duration = durationElement ? durationElement.textContent : '';
            
            // Parse price
            const priceMatch = price ? price.match(/\d+/) : null;
            const priceValue = priceMatch ? parseInt(priceMatch[0], 10) : 0;
            
            results.push({
              airline,
              price: priceValue,
              currency: 'USD', // Assuming USD
              departureTime,
              arrivalTime,
              duration
            });
          } catch (error) {
            console.error('Error parsing flight card:', error);
          }
        });
        
        return results;
      });
      
      await page.close();
      
      logger.info(`Found ${flights.length} flights from Skyscanner`);
      
      return flights.map(flight => ({
        ...flight,
        origin,
        destination,
        source: 'skyscanner',
        sourceUrl: url
      }));
    } catch (error) {
      logger.error(`Error scraping Skyscanner: ${error}`);
      throw error;
    }
  }
}

/**
 * Factory for creating scrapers
 */
export class ScraperFactory {
  static createScraper(type: string): FlightScraper {
    switch (type.toLowerCase()) {
      case 'google_flights':
        return new GoogleFlightsScraper();
      case 'skyscanner':
        return new SkyscannerScraper();
      default:
        throw new Error(`Unsupported scraper type: ${type}`);
    }
  }
}
