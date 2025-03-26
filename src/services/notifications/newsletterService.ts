import { Notification, User, Deal, Flight, Airport, Airline } from '@prisma/client';
import nodemailer from 'nodemailer';
import prisma from '../../utils/prisma';
import { logger } from '../../utils/logger';
import config from '../../config';

// Define types for better type safety
type NotificationWithRelations = Notification & {
  user: User;
  deal: Deal & {
    flight: Flight & {
      originAirport: Airport;
      destinationAirport: Airport;
      airlineInfo: Airline;
    };
  };
};

/**
 * Service for managing newsletter distribution
 */
export class NewsletterService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications(batchSize: number = 50): Promise<number> {
    try {
      // Get pending notifications
      const pendingNotifications = await prisma.notification.findMany({
        where: { status: 'pending' },
        include: {
          user: true,
          deal: {
            include: {
              flight: {
                include: {
                  originAirport: true,
                  destinationAirport: true,
                  airlineInfo: true
                }
              }
            }
          }
        },
        take: batchSize
      });

      logger.info(`Processing ${pendingNotifications.length} pending notifications`);

      let successCount = 0;
      let failureCount = 0;

      // Process each notification
      for (const notification of pendingNotifications) {
        try {
          await this.sendDealNotification(notification);
          
          // Update notification status
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: 'sent',
              sentAt: new Date()
            }
          });
          
          successCount++;
        } catch (error) {
          logger.error(`Error sending notification #${notification.id}: ${error}`);
          
          // Update notification status
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: 'failed'
            }
          });
          
          failureCount++;
        }
      }

      logger.info(`Processed ${pendingNotifications.length} notifications: ${successCount} sent, ${failureCount} failed`);
      return successCount;
    } catch (error) {
      logger.error(`Error processing pending notifications: ${error}`);
      throw error;
    }
  }

  /**
   * Send deal notification email
   */
  private async sendDealNotification(notification: NotificationWithRelations): Promise<void> {
    try {
      const { user, deal } = notification;
      const { flight } = deal;
      
      // Format dates
      const departureDate = new Date(flight.departureTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      
      const departureTime = new Date(flight.departureTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const arrivalTime = new Date(flight.arrivalTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Calculate duration in hours and minutes
      const durationHours = Math.floor(flight.duration / 60);
      const durationMinutes = flight.duration % 60;
      
      // Format expiration date
      const expiresAt = deal.expiresAt ? new Date(deal.expiresAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Unknown';
      
      // Generate view deal URL
      const viewDealUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${deal.id}`;
      
      // Generate unsubscribe URL with token
      const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(user.email)}`;
      
      // Generate email content
      const mailOptions = {
        from: config.email.from,
        to: user.email,
        subject: `Flight Deal Alert: ${flight.originAirport.city} to ${flight.destinationAirport.city} - ${deal.discountPercentage}% Off!`,
        html: this.generateDealEmailHtml({
          userName: user.firstName || 'Traveler',
          dealId: deal.id,
          originCity: flight.originAirport.city,
          originCode: flight.origin,
          destinationCity: flight.destinationAirport.city,
          destinationCode: flight.destination,
          airline: flight.airlineInfo.name,
          departureDate,
          departureTime,
          arrivalTime,
          duration: `${durationHours}h ${durationMinutes}m`,
          regularPrice: deal.regularPrice,
          currentPrice: flight.price,
          discountPercentage: deal.discountPercentage,
          dealQuality: deal.dealQuality,
          expiresAt,
          cabinClass: this.formatCabinClass(flight.cabinClass),
          viewDealUrl,
          unsubscribeUrl
        }),
        text: this.generateDealEmailText({
          userName: user.firstName || 'Traveler',
          dealId: deal.id,
          originCity: flight.originAirport.city,
          originCode: flight.origin,
          destinationCity: flight.destinationAirport.city,
          destinationCode: flight.destination,
          airline: flight.airlineInfo.name,
          departureDate,
          departureTime,
          arrivalTime,
          duration: `${durationHours}h ${durationMinutes}m`,
          regularPrice: deal.regularPrice,
          currentPrice: flight.price,
          discountPercentage: deal.discountPercentage,
          dealQuality: deal.dealQuality,
          expiresAt,
          cabinClass: this.formatCabinClass(flight.cabinClass),
          viewDealUrl,
          unsubscribeUrl
        })
      };

      // Send email
      await this.transporter.sendMail(mailOptions);
      logger.info(`Sent deal notification email to ${user.email} for deal #${deal.id}`);
    } catch (error) {
      logger.error(`Error sending deal notification email: ${error}`);
      throw error;
    }
  }

  /**
   * Format cabin class for display
   */
  private formatCabinClass(cabinClass: string): string {
    switch (cabinClass) {
      case 'economy':
        return 'Economy';
      case 'premium_economy':
        return 'Premium Economy';
      case 'business':
        return 'Business';
      case 'first':
        return 'First Class';
      default:
        return cabinClass;
    }
  }

  /**
   * Generate HTML email content for deal notification
   */
  private generateDealEmailHtml(data: any): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flight Deal Alert</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4A90E2;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .deal-badge {
            display: inline-block;
            background-color: #e74c3c;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            margin-left: 10px;
          }
          .deal-card {
            background-color: #f8f8f8;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .deal-route {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .deal-price {
            margin: 15px 0;
          }
          .original-price {
            text-decoration: line-through;
            color: #999;
          }
          .current-price {
            font-size: 24px;
            font-weight: bold;
            color: #e74c3c;
            margin-left: 10px;
          }
          .deal-details {
            margin: 15px 0;
          }
          .detail-row {
            margin-bottom: 5px;
          }
          .detail-label {
            font-weight: bold;
            display: inline-block;
            width: 120px;
          }
          .cta-button {
            display: inline-block;
            background-color: #4A90E2;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            font-size: 12px;
            color: #999;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Flight Deal Alert!</h1>
            <p>We found a great deal matching your preferences</p>
          </div>
          
          <p>Hello ${data.userName},</p>
          
          <p>We've found an amazing flight deal that matches your preferences:</p>
          
          <div class="deal-card">
            <div class="deal-route">
              ${data.originCity} (${data.originCode}) to ${data.destinationCity} (${data.destinationCode})
              <span class="deal-badge">${data.discountPercentage}% OFF</span>
            </div>
            
            <div class="deal-price">
              <span class="original-price">$${data.regularPrice.toFixed(2)}</span>
              <span class="current-price">$${data.currentPrice.toFixed(2)}</span>
            </div>
            
            <div class="deal-details">
              <div class="detail-row">
                <span class="detail-label">Airline:</span> ${data.airline}
              </div>
              <div class="detail-row">
                <span class="detail-label">Departure:</span> ${data.departureDate} at ${data.departureTime}
              </div>
              <div class="detail-row">
                <span class="detail-label">Arrival:</span> ${data.arrivalTime}
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span> ${data.duration}
              </div>
              <div class="detail-row">
                <span class="detail-label">Cabin Class:</span> ${data.cabinClass}
              </div>
              <div class="detail-row">
                <span class="detail-label">Deal Quality:</span> ${data.dealQuality.charAt(0).toUpperCase() + data.dealQuality.slice(1)}
              </div>
              <div class="detail-row">
                <span class="detail-label">Expires:</span> ${data.expiresAt}
              </div>
            </div>
          </div>
          
          <p>This price is ${data.discountPercentage}% lower than the average price for this route!</p>
          
          <p>
            <a href="${data.viewDealUrl}" class="cta-button">View Deal</a>
          </p>
          
          <p>Happy travels!</p>
          <p>The SkyDeal Team</p>
          
          <div class="footer">
            <p>
              You're receiving this email because you subscribed to flight deal alerts from SkyDeal.
              <a href="${data.unsubscribeUrl}">Unsubscribe</a> or 
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences">manage your preferences</a>.
            </p>
            <p>© ${new Date().getFullYear()} SkyDeal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content for deal notification
   */
  private generateDealEmailText(data: any): string {
    return `
FLIGHT DEAL ALERT!

Hello ${data.userName},

We've found an amazing flight deal that matches your preferences:

${data.originCity} (${data.originCode}) to ${data.destinationCity} (${data.destinationCode}) - ${data.discountPercentage}% OFF

Regular Price: $${data.regularPrice.toFixed(2)}
Current Price: $${data.currentPrice.toFixed(2)}

Airline: ${data.airline}
Departure: ${data.departureDate} at ${data.departureTime}
Arrival: ${data.arrivalTime}
Duration: ${data.duration}
Cabin Class: ${data.cabinClass}
Deal Quality: ${data.dealQuality.charAt(0).toUpperCase() + data.dealQuality.slice(1)}
Expires: ${data.expiresAt}

This price is ${data.discountPercentage}% lower than the average price for this route!

View Deal: ${data.viewDealUrl}

Happy travels!
The SkyDeal Team

---
You're receiving this email because you subscribed to flight deal alerts from SkyDeal.
Unsubscribe: ${data.unsubscribeUrl}
Manage preferences: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences
© ${new Date().getFullYear()} SkyDeal. All rights reserved.
    `;
  }

  /**
   * Generate and send weekly newsletter
   */
  async sendWeeklyNewsletter(): Promise<number> {
    try {
      logger.info('Generating weekly newsletter');
      
      // Get users who prefer weekly notifications
      const users = await prisma.user.findMany({
        where: {
          emailVerified: true,
          subscription: {
            status: 'active'
          },
          preferences: {
            notificationFrequency: 'weekly'
          }
        }
      });
      
      logger.info(`Found ${users.length} users for weekly newsletter`);
      
      let sentCount = 0;
      
      // For each user, get top deals based on their preferences
      for (const user of users) {
        try {
          // Get user preferences
          const preferences = await prisma.userPreference.findUnique({
            where: { userId: user.id }
          });
          
          if (!preferences) continue;
          
          // Build query based on user preferences
          const where: any = {
            expiresAt: {
              gt: new Date()
            },
            discountPercentage: {
              gte: preferences.minDiscount
            }
          };
          
          // Add flight conditions
          const flightWhere: any = {};
          
          // Origin airports
          if (preferences.originAirports && (preferences.originAirports as string[]).length > 0) {
            flightWhere.origin = {
              in: preferences.originAirports as string[]
            };
          }
          
          // Destination preference
          if (preferences.destinationPreference === 'specific' && 
              preferences.specificDestinations && 
              (preferences.specificDestinations as string[]).length > 0) {
            flightWhere.destination = {
              in: preferences.specificDestinations as string[]
            };
          }
          
          // Airline preference
          if (preferences.airlinePreference === 'specific' && 
              preferences.airlines && 
              (preferences.airlines as string[]).length > 0) {
            flightWhere.airline = {
              in: preferences.airlines as string[]
            };
          } else if (preferences.airlinePreference === 'exclude' && 
                    preferences.airlines && 
                    (preferences.airlines as string[]).length > 0) {
            flightWhere.airline = {
              notIn: preferences.airlines as string[]
            };
          }
          
          // Cabin class preference
          if (preferences.travelClass === 'economy') {
            flightWhere.cabinClass = 'economy';
          } else if (preferences.travelClass === 'premium') {
            const cabinClasses = [];
            if (preferences.premiumEconomy) cabinClasses.push('premium_economy');
            if (preferences.business) cabinClasses.push('business');
            if (preferences.first) cabinClasses.push('first');
            
            if (cabinClasses.length > 0) {
              flightWhere.cabinClass = {
                in: cabinClasses
              };
            }
          }
          
          if (Object.keys(flightWhere).length > 0) {
            where.flight = flightWhere;
          }
          
          // Get top deals for this user
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
            take: 5
          });
          
          if (deals.length === 0) {
            logger.info(`No matching deals found for user ${user.email}`);
            continue;
          }
          
          // Send weekly newsletter
          await this.sendWeeklyNewsletterEmail(user, deals);
          sentCount++;
          
          logger.info(`Sent weekly newsletter to ${user.email} with ${deals.length} deals`);
        } catch (error) {
          logger.error(`Error sending weekly newsletter to ${user.email}: ${error}`);
        }
      }
      
      logger.info(`Sent weekly newsletter to ${sentCount} users`);
      return sentCount;
    } catch (error) {
      logger.error(`Error generating weekly newsletter: ${error}`);
      throw error;
    }
  }

  /**
   * Send weekly newsletter email
   */
  private async sendWeeklyNewsletterEmail(user: User, deals: any[]): Promise<void> {
    try {
      // Generate unsubscribe URL
      const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(user.email)}`;
      
      // Generate email content
      const mailOptions = {
        from: config.email.from,
        to: user.email,
        subject: `Your Weekly Flight Deals - Top ${deals.length} Deals This Week`,
        html: this.generateWeeklyNewsletterHtml(user, deals, unsubscribeUrl),
        text: this.generateWeeklyNewsletterText(user, deals, unsubscribeUrl)
      };
      
      // Send email
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      logger.error(`Error sending weekly newsletter email: ${error}`);
      throw error;
    }
  }

  /**
   * Generate HTML content for weekly newsletter
   */
  private generateWeeklyNewsletterHtml(user: User, deals: any[], unsubscribeUrl: string): string {
    // Generate deals HTML
    const dealsHtml = deals.map(deal => {
      const flight = deal.flight;
      
      // Format dates
      const departureDate = new Date(flight.departureTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      
      const departureTime = new Date(flight.departureTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Generate view deal URL
      const viewDealUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${deal.id}`;
      
      return `
        <div class="deal-card">
          <div class="deal-route">
            ${flight.originAirport.city} (${flight.origin}) to ${flight.destinationAirport.city} (${flight.destination})
            <span class="deal-badge">${deal.discountPercentage}% OFF</span>
          </div>
          
          <div class="deal-price">
            <span class="original-price">$${deal.regularPrice.toFixed(2)}</span>
            <span class="current-price">$${flight.price.toFixed(2)}</span>
          </div>
          
          <div class="deal-details">
            <div class="detail-row">
              <span class="detail-label">Airline:</span> ${flight.airlineInfo.name}
            </div>
            <div class="detail-row">
              <span class="detail-label">Departure:</span> ${departureDate} at ${departureTime}
            </div>
            <div class="detail-row">
              <span class="detail-label">Cabin Class:</span> ${this.formatCabinClass(flight.cabinClass)}
            </div>
          </div>
          
          <p>
            <a href="${viewDealUrl}" class="cta-button">View Deal</a>
          </p>
        </div>
      `;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Weekly Flight Deals</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4A90E2;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .deal-badge {
            display: inline-block;
            background-color: #e74c3c;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            margin-left: 10px;
          }
          .deal-card {
            background-color: #f8f8f8;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .deal-route {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .deal-price {
            margin: 15px 0;
          }
          .original-price {
            text-decoration: line-through;
            color: #999;
          }
          .current-price {
            font-size: 20px;
            font-weight: bold;
            color: #e74c3c;
            margin-left: 10px;
          }
          .deal-details {
            margin: 15px 0;
          }
          .detail-row {
            margin-bottom: 5px;
          }
          .detail-label {
            font-weight: bold;
            display: inline-block;
            width: 100px;
          }
          .cta-button {
            display: inline-block;
            background-color: #4A90E2;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }
          .footer {
            font-size: 12px;
            color: #999;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Weekly Flight Deals</h1>
            <p>Top deals matching your preferences this week</p>
          </div>
          
          <p>Hello ${user.firstName || 'Traveler'},</p>
          
          <p>Here are the top flight deals we found for you this week:</p>
          
          ${dealsHtml}
          
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals" class="cta-button">View All Deals</a>
          </p>
          
          <p>Happy travels!</p>
          <p>The SkyDeal Team</p>
          
          <div class="footer">
            <p>
              You're receiving this email because you subscribed to weekly flight deal alerts from SkyDeal.
              <a href="${unsubscribeUrl}">Unsubscribe</a> or 
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences">manage your preferences</a>.
            </p>
            <p>© ${new Date().getFullYear()} SkyDeal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text content for weekly newsletter
   */
  private generateWeeklyNewsletterText(user: User, deals: any[], unsubscribeUrl: string): string {
    // Generate deals text
    const dealsText = deals.map(deal => {
      const flight = deal.flight;
      
      // Format dates
      const departureDate = new Date(flight.departureTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      
      const departureTime = new Date(flight.departureTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Generate view deal URL
      const viewDealUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${deal.id}`;
      
      return `
${flight.originAirport.city} (${flight.origin}) to ${flight.destinationAirport.city} (${flight.destination}) - ${deal.discountPercentage}% OFF

Regular Price: $${deal.regularPrice.toFixed(2)}
Current Price: $${flight.price.toFixed(2)}

Airline: ${flight.airlineInfo.name}
Departure: ${departureDate} at ${departureTime}
Cabin Class: ${this.formatCabinClass(flight.cabinClass)}

View Deal: ${viewDealUrl}
      `;
    }).join('\n---\n');
    
    return `
YOUR WEEKLY FLIGHT DEALS

Hello ${user.firstName || 'Traveler'},

Here are the top flight deals we found for you this week:

${dealsText}

View All Deals: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals

Happy travels!
The SkyDeal Team

---
You're receiving this email because you subscribed to weekly flight deal alerts from SkyDeal.
Unsubscribe: ${unsubscribeUrl}
Manage preferences: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences
© ${new Date().getFullYear()} SkyDeal. All rights reserved.
    `;
  }

  /**
   * Track email open
   */
  async trackEmailOpen(notificationId: number): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          openedAt: new Date()
        }
      });
      
      logger.info(`Tracked email open for notification #${notificationId}`);
    } catch (error) {
      logger.error(`Error tracking email open: ${error}`);
    }
  }

  /**
   * Track email click
   */
  async trackEmailClick(notificationId: number): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          clickedAt: new Date()
        }
      });
      
      logger.info(`Tracked email click for notification #${notificationId}`);
    } catch (error) {
      logger.error(`Error tracking email click: ${error}`);
    }
  }
}
