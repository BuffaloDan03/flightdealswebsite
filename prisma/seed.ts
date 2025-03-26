// This file contains seed data for the database
// It will be used to populate the database with initial data

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed popular airports
  const airports = [
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', latitude: 40.6413, longitude: -73.7781, timezone: 'America/New_York', popular: true },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', latitude: 33.9416, longitude: -118.4085, timezone: 'America/Los_Angeles', popular: true },
    { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'United States', latitude: 41.9742, longitude: -87.9073, timezone: 'America/Chicago', popular: true },
    { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', latitude: 37.6213, longitude: -122.3790, timezone: 'America/Los_Angeles', popular: true },
    { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', latitude: 25.7932, longitude: -80.2906, timezone: 'America/New_York', popular: true },
    { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', latitude: 51.4700, longitude: -0.4543, timezone: 'Europe/London', popular: true },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', latitude: 49.0097, longitude: 2.5479, timezone: 'Europe/Paris', popular: true },
    { code: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', latitude: 35.5494, longitude: 139.7798, timezone: 'Asia/Tokyo', popular: true },
  ];

  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { code: airport.code },
      update: airport,
      create: airport,
    });
  }
  console.log(`Seeded ${airports.length} airports`);

  // Seed airlines
  const airlines = [
    { code: 'DL', name: 'Delta Air Lines', logoUrl: '/images/airlines/delta.png', country: 'United States', active: true },
    { code: 'AA', name: 'American Airlines', logoUrl: '/images/airlines/american.png', country: 'United States', active: true },
    { code: 'UA', name: 'United Airlines', logoUrl: '/images/airlines/united.png', country: 'United States', active: true },
    { code: 'AF', name: 'Air France', logoUrl: '/images/airlines/air-france.png', country: 'France', active: true },
    { code: 'BA', name: 'British Airways', logoUrl: '/images/airlines/british-airways.png', country: 'United Kingdom', active: true },
    { code: 'NH', name: 'All Nippon Airways', logoUrl: '/images/airlines/ana.png', country: 'Japan', active: true },
  ];

  for (const airline of airlines) {
    await prisma.airline.upsert({
      where: { code: airline.code },
      update: airline,
      create: airline,
    });
  }
  console.log(`Seeded ${airlines.length} airlines`);

  // Seed demo user
  const demoUser = {
    email: 'demo@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    firstName: 'Demo',
    lastName: 'User',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const user = await prisma.user.upsert({
    where: { email: demoUser.email },
    update: demoUser,
    create: demoUser,
  });
  console.log(`Seeded demo user: ${user.email}`);

  // Seed subscription for demo user
  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planType: 'premium',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    create: {
      userId: user.id,
      planType: 'premium',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });
  console.log(`Seeded subscription for demo user`);

  // Seed user preferences for demo user
  const userPreferences = await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {
      originAirports: ['JFK', 'LGA', 'EWR'],
      destinationPreference: 'specific',
      specificDestinations: ['LAX', 'SFO', 'MIA', 'LHR', 'CDG'],
      airlinePreference: 'all',
      travelClass: 'economy',
      minDiscount: 25,
      notificationFrequency: 'daily',
    },
    create: {
      userId: user.id,
      originAirports: ['JFK', 'LGA', 'EWR'],
      destinationPreference: 'specific',
      specificDestinations: ['LAX', 'SFO', 'MIA', 'LHR', 'CDG'],
      airlinePreference: 'all',
      travelClass: 'economy',
      minDiscount: 25,
      notificationFrequency: 'daily',
    },
  });
  console.log(`Seeded user preferences for demo user`);

  // Seed tracked destinations for demo user
  const trackedDestinations = [
    { userId: user.id, destination: 'LAX' },
    { userId: user.id, destination: 'CDG' },
  ];

  for (const destination of trackedDestinations) {
    await prisma.trackedDestination.upsert({
      where: { 
        userId_destination: {
          userId: destination.userId,
          destination: destination.destination
        }
      },
      update: destination,
      create: destination,
    });
  }
  console.log(`Seeded ${trackedDestinations.length} tracked destinations for demo user`);

  console.log('Database seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
