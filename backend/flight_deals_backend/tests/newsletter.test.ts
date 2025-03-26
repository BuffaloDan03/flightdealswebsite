import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import { hashPassword } from '../src/utils/tokenGenerator';

// Mock data
const testUser = {
  email: 'test-newsletter@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User'
};

// Test notification and newsletter endpoints
describe('Notification and Newsletter Endpoints', () => {
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

    // Create test notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'deal',
        title: 'New Deal Alert',
        content: 'Great deal on flights to Paris!',
        status: 'pending'
      }
    });
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.notification.deleteMany({
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

  // Test get user notifications
  it('should get user notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('notifications');
    expect(Array.isArray(res.body.notifications)).toBeTruthy();
    expect(res.body.notifications.length).toBeGreaterThan(0);
    expect(res.body.notifications[0]).toHaveProperty('title');
    expect(res.body.notifications[0].title).toEqual('New Deal Alert');
  });

  // Test mark notification as read
  it('should mark notification as read', async () => {
    // Get notification ID
    const notificationsRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);
    
    const notificationId = notificationsRes.body.notifications[0].id;

    const res = await request(app)
      .put(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('marked as read');

    // Verify notification is marked as read
    const updatedNotificationsRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);
    
    const updatedNotification = updatedNotificationsRes.body.notifications.find(n => n.id === notificationId);
    expect(updatedNotification).toHaveProperty('readAt');
    expect(updatedNotification.readAt).not.toBeNull();
  });

  // Test tracking endpoints (these should return specific responses even without valid IDs)
  it('should handle email open tracking', async () => {
    const res = await request(app)
      .get('/api/notifications/track/open/999999');
    
    // Should return a 1x1 transparent GIF regardless of ID validity
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toEqual('image/gif');
  });

  it('should handle email click tracking', async () => {
    const res = await request(app)
      .get('/api/notifications/track/click/999999')
      .query({ redirect: 'http://example.com' });
    
    // Should redirect regardless of ID validity
    expect(res.statusCode).toEqual(302); // 302 is redirect status code
  });
});

// Test scraper endpoints
describe('Scraper Endpoints', () => {
  let adminAuthToken;
  let adminUserId;

  // Set up admin user and get auth token
  beforeAll(async () => {
    // Delete admin user if exists
    await prisma.user.deleteMany({
      where: { email: 'admin@example.com' }
    });

    // Create admin user
    const hashedPassword = await hashPassword('AdminPass123!');
    const user = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        verified: true,
        role: 'admin'
      }
    });
    adminUserId = user.id;

    // Login to get auth token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'AdminPass123!'
      });
    
    adminAuthToken = res.body.token;

    // Create test airports if they don't exist
    const airports = [
      { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA', popular: true },
      { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA', popular: true }
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
    await prisma.user.deleteMany({
      where: { id: adminUserId }
    });
    await prisma.$disconnect();
  });

  // Note: These tests will mock the scraper functionality since we don't want to actually scrape in tests
  // Test trigger scraping for a route
  it('should trigger scraping for a route', async () => {
    // This test assumes the scraper controller has been modified to mock scraping in test environment
    const res = await request(app)
      .post('/api/scraper/route')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({
        origin: 'SFO',
        destination: 'ORD',
        departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        returnDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 37 days from now
      });
    
    // In test mode, this should return a success message without actually scraping
    expect(res.statusCode).toEqual(202);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Scraping initiated');
  });

  // Test trigger scraping for popular routes
  it('should trigger scraping for popular routes', async () => {
    const res = await request(app)
      .post('/api/scraper/popular')
      .set('Authorization', `Bearer ${adminAuthToken}`);
    
    // In test mode, this should return a success message without actually scraping
    expect(res.statusCode).toEqual(202);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Scraping popular routes initiated');
  });
});
