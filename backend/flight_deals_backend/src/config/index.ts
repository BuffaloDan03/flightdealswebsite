// This file contains configuration for the application
// It loads environment variables and provides typed access to them

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  redis: {
    url: string;
  };
  logLevel: string;
}

// Default configuration
const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/flight_deals?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || 'user@example.com',
    password: process.env.EMAIL_PASSWORD || 'your_email_password',
    from: process.env.EMAIL_FROM || 'noreply@skydeal.com',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'your_stripe_webhook_secret',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
};

export default config;
