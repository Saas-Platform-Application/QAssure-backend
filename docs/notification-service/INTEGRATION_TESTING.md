# Notification Service Integration Testing Guide

This document outlines the integration testing guide for verifying routes, database hooks, WebSocket pushes, and end-to-end multi-channel delivery in QAssure.

---

## 1. Setup & Environment

Ensure that you run integration tests in a dedicated testing environment with:
- A test database initialized (e.g. `qassure_test`) with migration `082` and `085` executed.
- Authenticated JWT tokens for a Test Tenant Admin and a Test Standard User.
- A running Express server and WebSocket (Socket.io) listener.

---

## 2. API Integration Tests

Below is an integration suite setup using `supertest` and a mock WebSocket client:

```javascript
const request = require('supertest');
const app = require('../../src/app'); // Express App
const { io } = require('socket.io-client');

describe('Notification API & WS Integration', () => {
  let userToken;
  let adminToken;
  let clientSocket;

  beforeAll(async () => {
    // 1. Fetch test tokens
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@tenant.com', password: 'Password123' });
    userToken = userLogin.body.data.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@tenant.com', password: 'Password123' });
    adminToken = adminLogin.body.data.token;
  });

  afterAll(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  it('should get current user preferences', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('category_preferences');
  });

  it('should update user preferences', async () => {
    const res = await request(app)
      .put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        category_preferences: {
          capa: { in_app: true, email: false }
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.data.category_preferences.capa.email).toBe(false);
  });

  it('should deliver notifications via WebSocket in real-time', (done) => {
    // 1. Initialize client socket connection
    clientSocket = io('http://localhost:8000', {
      auth: { token: userToken }
    });

    clientSocket.on('connect', async () => {
      // 2. Trigger notification via Admin API (manual send)
      const sendRes = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: 'user-uuid-here',
          title: 'Integration Test Alert',
          message: 'This is a real-time test message',
          notification_type: 'info',
          category: 'system',
          priority: 'normal'
        });

      expect(sendRes.status).toBe(201);
    });

    clientSocket.on('notification', (data) => {
      expect(data.type).toBe('new');
      expect(data.notification.title).toBe('Integration Test Alert');
      done();
    });
  });
});
```
