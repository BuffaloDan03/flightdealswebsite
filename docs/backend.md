# Flight Deals SaaS - Backend Implementation Guide

This document provides comprehensive guidance for implementing the backend components of the Flight Deals Newsletter SaaS application. The backend is designed to support all the functionality presented in the frontend interface, including user authentication, subscription management, flight deal collection, and email notifications.

## Technology Stack

The recommended backend technology stack includes:

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **PostgreSQL**: Primary database
- **Redis**: Caching and job queue
- **TypeScript**: Programming language for type safety
- **Prisma**: ORM for database access
- **JWT**: Authentication token management
- **Stripe**: Payment processing
- **SendGrid/Mailchimp**: Email delivery
- **Docker**: Containerization
- **Kubernetes**: Orchestration (for production)

## System Architecture

The backend is organized into the following components:

```
backend/
├── src/
│   ├── config/                 # Configuration files
│   ├── controllers/            # Request handlers
│   ├── middleware/             # Express middleware
│   ├── models/                 # Database models
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   │   ├── auth/               # Authentication services
│   │   ├── deals/              # Flight deal services
│   │   ├── notifications/      # Email notification services
│   │   ├── payments/           # Subscription/payment services
│   │   ├── scraper/            # Web scraping services
│   │   └── user/               # User management services
│   ├── utils/                  # Utility functions
│   ├── jobs/                   # Background jobs
│   ├── app.ts                  # Express application setup
│   └── server.ts               # Server entry point
├── prisma/                     # Prisma schema and migrations
├── tests/                      # Test files
├── Dockerfile                  # Docker configuration
├── docker-compose.yml          # Docker Compose configuration
├── package.json                # Dependencies
└── tsconfig.json               # TypeScript configuration
```

## Database Schema

The PostgreSQL database schema includes the following tables:

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  plan_type VARCHAR(50) NOT NULL, -- 'free', 'premium', 'premium_plus'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing'
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### User Preferences Table
```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  origin_airports JSONB, -- Array of airport codes
  destination_preference VARCHAR(50) DEFAULT 'all', -- 'all' or 'specific'
  specific_destinations JSONB, -- Array of destination codes
  airline_preference VARCHAR(50) DEFAULT 'all', -- 'all', 'specific', or 'exclude'
  airlines JSONB, -- Array of airline codes
  travel_class VARCHAR(50) DEFAULT 'economy', -- 'economy' or 'premium'
  premium_economy BOOLEAN DEFAULT FALSE,
  business BOOLEAN DEFAULT FALSE,
  first BOOLEAN DEFAULT FALSE,
  min_discount INTEGER DEFAULT 20, -- Minimum discount percentage
  notification_frequency VARCHAR(50) DEFAULT 'daily', -- 'real-time', 'daily', 'weekly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Airports Table
```sql
CREATE TABLE airports (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  timezone VARCHAR(50),
  popular BOOLEAN DEFAULT FALSE
);
```

### Airlines Table
```sql
CREATE TABLE airlines (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(255),
  country VARCHAR(100),
  active BOOLEAN DEFAULT TRUE
);
```

### Flights Table
```sql
CREATE TABLE flights (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(10) REFERENCES airports(code),
  destination VARCHAR(10) REFERENCES airports(code),
  airline VARCHAR(10) REFERENCES airlines(code),
  flight_number VARCHAR(20),
  departure_time TIMESTAMP WITH TIME ZONE,
  arrival_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in minutes
  cabin_class VARCHAR(50), -- 'economy', 'premium_economy', 'business', 'first'
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  source VARCHAR(50), -- 'skyscanner', 'google_flights', 'airline_direct'
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Deals Table
```sql
CREATE TABLE deals (
  id SERIAL PRIMARY KEY,
  flight_id INTEGER REFERENCES flights(id),
  regular_price DECIMAL(10, 2), -- Historical average price
  discount_percentage INTEGER,
  deal_quality VARCHAR(20), -- 'good', 'great', 'amazing'
  expires_at TIMESTAMP WITH TIME ZONE,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Price History Table
```sql
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(10) REFERENCES airports(code),
  destination VARCHAR(10) REFERENCES airports(code),
  airline VARCHAR(10) REFERENCES airlines(code),
  cabin_class VARCHAR(50),
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tracked Destinations Table
```sql
CREATE TABLE tracked_destinations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  destination VARCHAR(10) REFERENCES airports(code),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  deal_id INTEGER REFERENCES deals(id),
  status VARCHAR(50), -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

The backend exposes the following RESTful API endpoints:

### Authentication Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/verify-email/:token
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET /api/auth/me
```

### User Endpoints

```
GET /api/users/profile
PUT /api/users/profile
GET /api/users/preferences
PUT /api/users/preferences
```

### Subscription Endpoints

```
GET /api/subscriptions
POST /api/subscriptions
PUT /api/subscriptions/:id
DELETE /api/subscriptions/:id
POST /api/subscriptions/webhook
```

### Deals Endpoints

```
GET /api/deals
GET /api/deals/:id
GET /api/deals/featured
GET /api/deals/search
```

### Airports Endpoints

```
GET /api/airports
GET /api/airports/popular
GET /api/airports/search
```

### Airlines Endpoints

```
GET /api/airlines
GET /api/airlines/search
```

### Destinations Endpoints

```
GET /api/destinations/tracked
POST /api/destinations/tracked
DELETE /api/destinations/tracked/:id
```

### Notifications Endpoints

```
GET /api/notifications
PUT /api/notifications/preferences
```

## Implementation Details

### 1. User Authentication System

The authentication system uses JWT (JSON Web Tokens) for stateless authentication:

```typescript
// src/services/auth/authService.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function registerUser(email: string, password: string, firstName?: string, lastName?: string) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Generate verification token
  const verificationToken = generateRandomToken();

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      verification_token: verificationToken
    }
  });

  // Create free subscription
  await prisma.subscription.create({
    data: {
      user_id: user.id,
      plan_type: 'free',
      status: 'active'
    }
  });

  // Create default preferences
  await prisma.userPreference.create({
    data: {
      user_id: user.id
    }
  });

  // Send verification email
  await sendVerificationEmail(email, verificationToken);

  return { userId: user.id };
}

export async function loginUser(email: string, password: string) {
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { last_login: new Date() }
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, userId: user.id };
}

// Additional authentication functions...
```

### 2. Flight Deal Collection System

The flight deal collection system combines API integration and web scraping:

```typescript
// src/services/deals/dealCollectionService.ts
import { PrismaClient } from '@prisma/client';
import { scrapeGoogleFlights } from '../scraper/googleFlightsScraper';
import { fetchSkyscannerDeals } from '../scraper/skyscannerApi';
import { fetchAirlineDeals } from '../scraper/airlineScraper';

const prisma = new PrismaClient();

export async function collectFlightDeals() {
  try {
    // Collect deals from multiple sources
    const googleFlightsDeals = await scrapeGoogleFlights();
    const skyscannerDeals = await fetchSkyscannerDeals();
    const airlineDeals = await fetchAirlineDeals();

    // Combine and normalize deals
    const allDeals = [
      ...googleFlightsDeals,
      ...skyscannerDeals,
      ...airlineDeals
    ];

    // Process each deal
    for (const deal of allDeals) {
      await processDeal(deal);
    }

    console.log(`Collected ${allDeals.length} flight deals`);
  } catch (error) {
    console.error('Error collecting flight deals:', error);
  }
}

async function processDeal(dealData: any) {
  // Check if flight already exists
  const existingFlight = await prisma.flight.findFirst({
    where: {
      origin: dealData.origin,
      destination: dealData.destination,
      airline: dealData.airline,
      flight_number: dealData.flightNumber,
      departure_time: dealData.departureTime,
      cabin_class: dealData.cabinClass
    }
  });

  // Create or update flight
  const flight = existingFlight 
    ? await prisma.flight.update({
        where: { id: existingFlight.id },
        data: { price: dealData.price }
      })
    : await prisma.flight.create({
        data: {
          origin: dealData.origin,
          destination: dealData.destination,
          airline: dealData.airline,
          flight_number: dealData.flightNumber,
          departure_time: dealData.departureTime,
          arrival_time: dealData.arrivalTime,
          duration: dealData.duration,
          cabin_class: dealData.cabinClass,
          price: dealData.price,
          currency: dealData.currency,
          source: dealData.source,
          source_url: dealData.sourceUrl
        }
      });

  // Get historical average price
  const regularPrice = await getHistoricalAveragePrice(
    dealData.origin,
    dealData.destination,
    dealData.airline,
    dealData.cabinClass
  );

  // Calculate discount percentage
  const discountPercentage = Math.round(
    ((regularPrice - dealData.price) / regularPrice) * 100
  );

  // Only create deal if discount is at least 20%
  if (discountPercentage >= 20) {
    // Determine deal quality
    let dealQuality = 'good';
    if (discountPercentage > 50) {
      dealQuality = 'amazing';
    } else if (discountPercentage > 30) {
      dealQuality = 'great';
    }

    // Create deal
    await prisma.deal.create({
      data: {
        flight_id: flight.id,
        regular_price: regularPrice,
        discount_percentage: discountPercentage,
        deal_quality: dealQuality,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    });

    // Update price history
    await prisma.priceHistory.create({
      data: {
        origin: dealData.origin,
        destination: dealData.destination,
        airline: dealData.airline,
        cabin_class: dealData.cabinClass,
        price: dealData.price,
        currency: dealData.currency,
        date: new Date()
      }
    });

    // Trigger notifications for matching users
    await triggerDealNotifications(flight, discountPercentage, dealQuality);
  }
}

// Additional deal collection functions...
```

### 3. Email Notification System

The email notification system handles personalized deal alerts:

```typescript
// src/services/notifications/emailService.ts
import { PrismaClient } from '@prisma/client';
import sgMail from '@sendgrid/mail';

const prisma = new PrismaClient();
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendDealNotification(userId: number, dealId: number) {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true
      }
    });

    if (!user || !user.email_verified) {
      return;
    }

    // Get deal details
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        flight: {
          include: {
            origin_airport: true,
            destination_airport: true,
            airline: true
          }
        }
      }
    });

    if (!deal) {
      return;
    }

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        deal_id: dealId,
        status: 'pending'
      }
    });

    // Prepare email content
    const emailContent = generateDealEmailContent(user, deal);

    // Send email
    const result = await sgMail.send({
      to: user.email,
      from: 'deals@skydeal.com',
      subject: `${deal.discount_percentage}% OFF: ${deal.flight.origin_airport.city} to ${deal.flight.destination_airport.city}`,
      html: emailContent,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      customArgs: {
        notification_id: notification.id.toString()
      }
    });

    // Update notification status
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'sent',
        sent_at: new Date()
      }
    });

    return result;
  } catch (error) {
    console.error('Error sending deal notification:', error);
    
    // Update notification status to failed
    if (dealId && userId) {
      await prisma.notification.updateMany({
        where: {
          user_id: userId,
          deal_id: dealId,
          status: 'pending'
        },
        data: {
          status: 'failed'
        }
      });
    }
  }
}

function generateDealEmailContent(user: any, deal: any) {
  // Generate personalized email content based on user preferences and deal details
  // This would include HTML templates with deal information, images, and call-to-action buttons
  
  // For premium users, include more detailed information and personalized recommendations
  const isPremium = user.subscription?.plan_type === 'premium' || user.subscription?.plan_type === 'premium_plus';
  
  // Example template (simplified)
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Amazing Flight Deal Alert!</h1>
      <div style="background-color: #f5f7ff; padding: 20px; border-radius: 8px;">
        <h2>${deal.flight.origin_airport.city} to ${deal.flight.destination_airport.city}</h2>
        <p style="font-size: 24px; color: #10b981;">
          <strong>${deal.discount_percentage}% OFF</strong> - $${deal.flight.price} (was $${deal.regular_price})
        </p>
        <p>
          <strong>Airline:</strong> ${deal.flight.airline.name}<br>
          <strong>Dates:</strong> ${formatDate(deal.flight.departure_time)} - ${formatDate(deal.flight.arrival_time)}<br>
          <strong>Class:</strong> ${formatCabinClass(deal.flight.cabin_class)}
        </p>
        ${isPremium ? `
          <p><strong>Deal Quality:</strong> ${formatDealQuality(deal.deal_quality)}</p>
          <p><strong>Expires:</strong> ${formatDate(deal.expires_at)}</p>
        ` : ''}
        <a href="https://yourdomain.com/deals/${deal.id}" style="display: block; background-color: #5d5fef; color: white; text-align: center; padding: 12px; border-radius: 4px; text-decoration: none; margin-top: 20px;">
          View Deal
        </a>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        You're receiving this email because you subscribed to flight deals from SkyDeal.
        <a href="https://yourdomain.com/preferences">Manage your preferences</a> or
        <a href="https://yourdomain.com/unsubscribe?token=${generateUnsubscribeToken(user.id)}">unsubscribe</a>.
      </p>
    </div>
  `;
}

// Additional email notification functions...
```

### 4. Subscription Management System

The subscription management system integrates with Stripe for payment processing:

```typescript
// src/services/payments/subscriptionService.ts
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

export async function createSubscription(userId: number, planType: string) {
  try {
    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Get plan details
    const planDetails = getPlanDetails(planType);
    if (!planDetails) {
      throw new Error('Invalid plan type');
    }

    // Check if user already has a subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: { user_id: userId, status: { in: ['active', 'trialing'] } }
    });

    // If user has free plan and is upgrading, or is changing between paid plans
    if (existingSubscription) {
      if (existingSubscription.plan_type === 'free' && planType !== 'free') {
        // Create Stripe customer if not exists
        let stripeCustomerId = existingSubscription.stripe_customer_id;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: `${user.first_name} ${user.last_name}`.trim(),
            metadata: {
              userId: user.id.toString()
            }
          });
          stripeCustomerId = customer.id;
        }

        // Create Stripe subscription
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: planDetails.stripePriceId }],
          trial_period_days: 7,
          metadata: {
            userId: user.id.toString(),
            planType
          }
        });

        // Update subscription in database
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            plan_type: planType,
            status: 'trialing',
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000)
          }
        });

        return {
          subscriptionId: existingSubscription.id,
          stripeSubscriptionId: subscription.id,
          status: 'trialing'
        };
      } else if (planType !== 'free' && existingSubscription.plan_type !== planType) {
        // Change subscription plan
        if (!existingSubscription.stripe_subscription_id) {
          throw new Error('No Stripe subscription found');
        }

        // Get current subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(
          existingSubscription.stripe_subscription_id
        );

        // Update subscription items
        await stripe.subscriptions.update(
          existingSubscription.stripe_subscription_id,
          {
            items: [
              {
                id: stripeSubscription.items.data[0].id,
                price: planDetails.stripePriceId
              }
            ],
            metadata: {
              userId: user.id.toString(),
              planType
            }
          }
        );

        // Update subscription in database
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            plan_type: planType
          }
        });

        return {
          subscriptionId: existingSubscription.id,
          stripeSubscriptionId: existingSubscription.stripe_subscription_id,
          status: existingSubscription.status
        };
      } else if (planType === 'free' && existingSubscription.plan_type !== 'free') {
        // Downgrade to free plan
        if (existingSubscription.stripe_subscription_id) {
          // Cancel Stripe subscription
          await stripe.subscriptions.cancel(existingSubscription.stripe_subscription_id);
        }

        // Update subscription in database
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            plan_type: 'free',
            status: 'active',
            stripe_subscription_id: null,
            cancel_at_period_end: false
          }
        });

        return {
          subscriptionId: existingSubscription.id,
          status: 'active'
        };
      }

      // No change needed
      return {
        subscriptionId: existingSubscription.id,
        stripeSubscriptionId: existingSubscription.stripe_subscription_id,
        status: existingSubscription.status
      };
    } else {
      // Create new subscription
      if (planType === 'free') {
        // Create free subscription
        const subscription = await prisma.subscription.create({
          data: {
            user_id: userId,
            plan_type: 'free',
            status: 'active'
          }
        });

        return {
          subscriptionId: subscription.id,
          status: 'active'
        };
      } else {
        // Create Stripe customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
          metadata: {
            userId: user.id.toString()
          }
        });

        // Create Stripe subscription
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: planDetails.stripePriceId }],
          trial_period_days: 7,
          metadata: {
            userId: user.id.toString(),
            planType
          }
        });

        // Create subscription in database
        const dbSubscription = await prisma.subscription.create({
          data: {
            user_id: userId,
            plan_type: planType,
            status: 'trialing',
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000)
          }
        });

        return {
          subscriptionId: dbSubscription.id,
          stripeSubscriptionId: subscription.id,
          status: 'trialing'
        };
      }
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

function getPlanDetails(planType: string) {
  switch (planType) {
    case 'premium':
      return {
        name: 'Premium',
        price: 4.99,
        stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID
      };
    case 'premium_plus':
      return {
        name: 'Premium+',
        price: 9.99,
        stripePriceId: process.env.STRIPE_PREMIUM_PLUS_PRICE_ID
      };
    case 'free':
      return {
        name: 'Free',
        price: 0,
        stripePriceId: null
      };
    default:
      return null;
  }
}

// Additional subscription management functions...
```

## Deployment

The application can be deployed using Docker and Kubernetes:

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/flight_deals
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret-key
      - STRIPE_SECRET_KEY=your-stripe-key
      - SENDGRID_API_KEY=your-sendgrid-key
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=flight_deals
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

### Kubernetes Configuration

For production deployment, Kubernetes manifests should be created for each component:

- Deployment for the application
- StatefulSet for PostgreSQL
- StatefulSet for Redis
- Services for networking
- Ingress for external access
- ConfigMaps and Secrets for configuration

## Monitoring and Maintenance

The application should include:

1. **Logging**: Using Winston or similar for structured logging
2. **Metrics**: Prometheus for collecting metrics
3. **Alerting**: Grafana for visualization and alerting
4. **Error Tracking**: Sentry for error monitoring
5. **Performance Monitoring**: New Relic or similar for APM

## Development Workflow

1. Set up local development environment
2. Implement backend components incrementally
3. Test thoroughly with unit and integration tests
4. Deploy to staging environment
5. Perform end-to-end testing
6. Deploy to production

## Next Steps

1. Implement user authentication backend
2. Develop database schema and models
3. Create flight deals API endpoints
4. Implement subscription management system
5. Develop email notification system
6. Integrate and test the complete system

This backend implementation guide provides a comprehensive framework for developing the server-side components of the Flight Deals Newsletter SaaS application. By following this guide, you can create a robust, scalable backend that supports all the functionality presented in the frontend interface.
