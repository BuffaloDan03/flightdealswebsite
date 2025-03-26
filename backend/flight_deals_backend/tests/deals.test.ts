import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import { hashPassword } from '../src/utils/tokenGenerator';

// Mock data
const testUser = {
  email: 'test-deals@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User'
};

// Test deal endpoints
describe('Deal Endpoints', () => {
  let authToken;
  let userId;

  // Set up test user and get auth token
  beforeAll(async () => {
    // Delete test user if exists
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });

    // Create test user
    const hashedPassword = await hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        verified: true
      }
    });
    userId = user.id;

    // Create subscription for user
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planType: 'free',
        status: 'active'
      }
    });

    // Login to get auth token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    authToken = res.body.token;

    // Create some test airports if they don't exist
    const airports = [
      { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', popular: true },
      { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', popular: true }
    ];

    for (const airport of airports) {
      await prisma.airport.upsert({
        where: { code: airport.code },
        update: {},
        create: airport
      });
    }

    // Create test airline if it doesn't exist
    await prisma.airline.upsert({
      where: { code: 'DL' },
      update: {},
      create: {
        code: 'DL',
        name: 'Delta Air Lines',
        logo: 'delta.png'
      }
    });

    // Create test flight
    await prisma.flight.create({
      data: {
        origin: 'JFK',
        destination: 'LAX',
        airline: 'DL',
        price: 299.99,
        departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        returnDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // 37 days from now
        cabinClass: 'economy'
      }
    });
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.deal.deleteMany({});
    await prisma.flight.deleteMany({});
    await prisma.subscription.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  // Test get featured deals
  it('should get featured deals', async () => {
    const res = await request(app)
      .get('/api/deals/featured');
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  // Test search deals
  it('should search deals', async () => {
    const res = await request(app)
      .get('/api/deals/search?origin=JFK&destination=LAX');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('deals');
    expect(Array.isArray(res.body.deals)).toBeTruthy();
  });

  // Test get deal by ID (create a deal first)
  it('should get deal by ID', async () => {
    // Create a test deal
    const flight = await prisma.flight.findFirst({
      where: {
        origin: 'JFK',
        destination: 'LAX'
      }
    });

    const deal = await prisma.deal.create({
      data: {
        flightId: flight.id,
        discountPercentage: 25,
        previousPrice: 399.99,
        currentPrice: 299.99,
        dealQuality: 'good',
        featured: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    });

    const res = await request(app)
      .get(`/api/deals/${deal.id}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('discountPercentage');
    expect(res.body).toHaveProperty('flight');
    expect(res.body.id).toEqual(deal.id);
  });
});

// Test destination endpoints
describe('Destination Endpoints', () => {
  let authToken;
  let premiumAuthToken;
  let userId;
  let premiumUserId;

  // Set up test users and get auth tokens
  beforeAll(async () => {
    // Delete test users if they exist
    await prisma.user.deleteMany({
      where: { 
        OR: [
          { email: testUser.email },
          { email: 'premium-test@example.com' }
        ]
      }
    });

    // Create regular test user
    const hashedPassword = await hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        verified: true
      }
    });
    userId = user.id;

    // Create free subscription for regular user
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planType: 'free',
        status: 'active'
      }
    });

    // Create premium test user
    const premiumUser = await prisma.user.create({
      data: {
        email: 'premium-test@example.com',
        password: hashedPassword,
        firstName: 'Premium',
        lastName: 'User',
        verified: true
      }
    });
    premiumUserId = premiumUser.id;

    // Create premium subscription for premium user
    await prisma.subscription.create({
      data: {
        userId: premiumUser.id,
        planType: 'premium',
        status: 'active'
      }
    });

    // Login to get auth tokens
    const regularRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    authToken = regularRes.body.token;

    const premiumRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'premium-test@example.com',
        password: testUser.password
      });
    
    premiumAuthToken = premiumRes.body.token;

    // Create test airports if they don't exist
    const airports = [
      { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', popular: true },
      { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', popular: true }
    ];

    for (const airport of airports) {
      await prisma.airport.upsert({
        where: { code: airport.code },
        update: {},
        create: airport
      });
    }
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.trackedDestination.deleteMany({
      where: {
        OR: [
          { userId },
          { userId: premiumUserId }
        ]
      }
    });
    await prisma.subscription.deleteMany({
      where: {
        OR: [
          { userId },
          { userId: premiumUserId }
        ]
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: userId },
          { id: premiumUserId }
        ]
      }
    });
    await prisma.$disconnect();
  });

  // Test get tracked destinations
  it('should get tracked destinations', async () => {
    const res = await request(app)
      .get('/api/destinations/tracked')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  // Test add tracked destination (free user - should be denied)
  it('should deny free user from adding tracked destination', async () => {
    const res = await request(app)
      .post('/api/destinations/tracked')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ airportCode: 'CDG' });
    
    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Premium subscription required');
    expect(res.body).toHaveProperty('upgradeRequired');
    expect(res.body.upgradeRequired).toEqual(true);
  });

  // Test add tracked destination (premium user - should succeed)
  it('should allow premium user to add tracked destination', async () => {
    const res = await request(app)
      .post('/api/destinations/tracked')
      .set('Authorization', `Bearer ${premiumAuthToken}`)
      .send({ airportCode: 'CDG' });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Destination added');
    expect(res.body).toHaveProperty('trackedDestination');
    expect(res.body.trackedDestination.airportCode).toEqual('CDG');
  });

  // Test get destination suggestions (premium user)
  it('should get destination suggestions for premium user', async () => {
    const res = await request(app)
      .get('/api/destinations/suggestions')
      .set('Authorization', `Bearer ${premiumAuthToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('popular');
    expect(Array.isArray(res.body.popular)).toBeTruthy();
  });
});
