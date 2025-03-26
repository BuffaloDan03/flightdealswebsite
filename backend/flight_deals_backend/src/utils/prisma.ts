import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Create a singleton instance of PrismaClient
let prisma: PrismaClient;

if (!global.prisma) {
  global.prisma = new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });

  // Log queries in development environment
  if (process.env.NODE_ENV === 'development') {
    global.prisma.$on('query', (e: any) => {
      logger.debug(`Query: ${e.query}`);
      logger.debug(`Duration: ${e.duration}ms`);
    });
  }

  // Log errors
  global.prisma.$on('error', (e: any) => {
    logger.error(`Prisma Error: ${e.message}`);
  });

  prisma = global.prisma;
} else {
  prisma = global.prisma;
}

export default prisma;
