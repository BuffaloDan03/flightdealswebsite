import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import { hashPassword } from '../src/utils/tokenGenerator';

// Mock user data
const testUser = {
  email: 'test@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User'
};

// Test authentication endpoints
describe('Authentication Endpoints', () => {
  // Clean up database before and after tests
  beforeAll(async () => {
    // Delete test user if exists
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  // Test user registration
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('registered successfully');
  });

  // Test login with valid credentials
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toEqual(testUser.email);
  });

  // Test login with invalid credentials
  it('should not login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Invalid credentials');
  });
});

// Test user endpoints
describe('User Endpoints', () => {
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

    // Create preferences for user
    await prisma.userPreference.create({
      data: {
        userId: user.id,
        originAirports: ['JFK', 'LGA'],
        travelClass: 'economy'
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
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.userPreference.deleteMany({
      where: { userId }
    });
    await prisma.subscription.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  // Test get user profile
  it('should get user profile', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
    expect(res.body.email).toEqual(testUser.email);
  });

  // Test update user profile
  it('should update user profile', async () => {
    const updatedData = {
      firstName: 'Updated',
      lastName: 'Name'
    };

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedData);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('updated successfully');
    expect(res.body.user.firstName).toEqual(updatedData.firstName);
    expect(res.body.user.lastName).toEqual(updatedData.lastName);
  });

  // Test get user preferences
  it('should get user preferences', async () => {
    const res = await request(app)
      .get('/api/users/preferences')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('originAirports');
    expect(res.body.originAirports).toContain('JFK');
    expect(res.body).toHaveProperty('travelClass');
    expect(res.body.travelClass).toEqual('economy');
  });

  // Test update user preferences
  it('should update user preferences', async () => {
    const updatedPreferences = {
      originAirports: ['LAX', 'SFO'],
      travelClass: 'economy'
    };

    const res = await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedPreferences);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('updated successfully');
    expect(res.body.preferences.originAirports).toContain('LAX');
    expect(res.body.preferences.originAirports).toContain('SFO');
  });
});

// Test subscription endpoints
describe('Subscription Endpoints', () => {
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
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.subscription.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  // Test get subscription plans
  it('should get subscription plans', async () => {
    const res = await request(app)
      .get('/api/subscriptions/plans');
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('price');
  });

  // Test get current subscription
  it('should get current subscription', async () => {
    const res = await request(app)
      .get('/api/subscriptions/current')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('planType');
    expect(res.body).toHaveProperty('status');
    expect(res.body.planType).toEqual('free');
    expect(res.body.status).toEqual('active');
  });

  // Test check feature access
  it('should check feature access', async () => {
    const res = await request(app)
      .get('/api/subscriptions/check-access/specific_airports')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('hasAccess');
    expect(res.body).toHaveProperty('requiredPlan');
    expect(res.body.hasAccess).toEqual(false);
    expect(res.body.requiredPlan).toEqual('premium');
  });
});
