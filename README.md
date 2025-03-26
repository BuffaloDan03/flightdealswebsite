# Flight Deals SaaS Backend

This is the backend API for the Flight Deals SaaS newsletter service. It provides functionality for user management, flight deal scraping, deal detection, and newsletter distribution.

## Features

- User authentication and management
- Subscription management with Stripe integration
- Flight scraping from multiple sources
- Deal detection algorithm
- Newsletter distribution system
- Premium features for paid subscribers

## Tech Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Stripe for payments
- SendGrid for emails
- Jest for testing
- Docker for deployment

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL
- Stripe account
- SendGrid account

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
4. Update the `.env` file with your configuration
5. Run database migrations:
   ```
   npx prisma migrate dev
   ```
6. Seed the database:
   ```
   npm run seed
   ```
7. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/verify-email/:token` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/preferences` - Get user preferences
- `PUT /api/users/preferences` - Update user preferences

### Subscriptions

- `GET /api/subscriptions/plans` - Get subscription plans
- `GET /api/subscriptions/current` - Get current subscription
- `POST /api/subscriptions/create-checkout-session` - Create Stripe checkout session
- `POST /api/subscriptions/webhook` - Handle Stripe webhook events
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/check-access/:feature` - Check feature access

### Destinations

- `GET /api/destinations/tracked` - Get user's tracked destinations
- `POST /api/destinations/tracked` - Add destination to tracked destinations (Premium)
- `DELETE /api/destinations/tracked/:id` - Remove destination from tracked destinations
- `GET /api/destinations/suggestions` - Get premium destination suggestions (Premium)

### Airlines

- `GET /api/airlines` - Get all airlines
- `GET /api/airlines/preferences` - Get user's airline preferences
- `PUT /api/airlines/preferences` - Update user's airline preferences (Premium)
- `GET /api/airlines/cabin-classes` - Get premium cabin class options
- `PUT /api/airlines/cabin-classes` - Update user's cabin class preferences (Premium/Premium+)

### Deals

- `GET /api/deals/featured` - Get featured deals
- `GET /api/deals/search` - Search deals
- `GET /api/deals/:id` - Get deal by ID
- `GET /api/deals/premium` - Get premium deals (Premium)

### Notifications

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `GET /api/notifications/track/open/:id` - Track email open
- `GET /api/notifications/track/click/:id` - Track email click
- `POST /api/notifications/process` - Process pending notifications (Admin)
- `POST /api/notifications/weekly-newsletter` - Send weekly newsletter (Admin)

### Scraper

- `POST /api/scraper/route` - Trigger scraping for a route (Admin)
- `POST /api/scraper/popular` - Trigger scraping for popular routes (Admin)

## Premium Features

The following features are available only to premium subscribers:

- Tracking specific destinations
- Filtering by preferred airlines
- Premium Economy cabin class

The following features are available only to premium+ subscribers:

- Business and First class deals
- Priority notifications
- Personalized deal recommendations

## Deployment

### Using Docker

1. Build and run using Docker Compose:
   ```
   docker-compose up -d
   ```

2. The API will be available at http://localhost:3001

### Manual Deployment

1. Build the TypeScript code:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm run start:prod
   ```

## Testing

Run the test suite:
```
npm test
```

## License

This project is proprietary and confidential.
