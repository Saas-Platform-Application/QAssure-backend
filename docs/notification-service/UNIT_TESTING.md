# Notification Service Unit Testing Guide

This document outlines the unit testing guide, mocked dependencies, and test scripts for isolating and verifying internal Notification Service logic.

---

## 1. Mocking Strategy

To test `NotificationService` in isolation, mock all database connections, the email service, and the Socket.io server layer.

```javascript
const { NotificationService } = require('../../src/services/notification.service');
const { pool } = require('../../src/config/database');
const emailService = require('../../src/services/email/email.service');
const { getSocketService } = require('../../src/infrastructure/websocket');

// Jest Mock Example
jest.mock('../../src/config/database');
jest.mock('../../src/services/email/email.service');
jest.mock('../../src/infrastructure/websocket');
```

---

## 2. Test Suites

### 2.1 Template Compiler Test Case
Verify variable substitution using the mustache implementation in `_renderTemplate`:

```javascript
describe('Notification Template Rendering', () => {
  it('should interpolate variables correctly', () => {
    const service = new NotificationService();
    const template = 'Hello {{user_name}}, welcome to {{system}}!';
    const variables = { user_name: 'John Doe', system: 'QAssure' };
    
    const rendered = service._renderTemplate(template, variables);
    expect(rendered).toBe('Hello John Doe, welcome to QAssure!');
  });

  it('should fall back to empty string for missing variables', () => {
    const service = new NotificationService();
    const template = 'Your ticket is {{status}}';
    const variables = {};
    
    const rendered = service._renderTemplate(template, variables);
    expect(rendered).toBe('Your ticket is ');
  });
});
```

### 2.2 Quiet Hours Evaluator
Verify the math for identifying whether a specific time falls within the user's quiet hours:

```javascript
describe('Quiet Hours Calculation', () => {
  it('should identify when current time is within quiet hours window', () => {
    const service = new NotificationService();
    const preferences = {
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '06:00:00',
      timezone: 'UTC'
    };
    
    // 23:30:00 UTC is inside
    const isQuiet = service._checkQuietHours(preferences, new Date('2026-06-22T23:30:00Z'));
    expect(isQuiet).toBe(true);
  });

  it('should identify when current time is outside quiet hours window', () => {
    const service = new NotificationService();
    const preferences = {
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '06:00:00',
      timezone: 'UTC'
    };
    
    // 14:00:00 UTC is outside
    const isQuiet = service._checkQuietHours(preferences, new Date('2026-06-22T14:00:00Z'));
    expect(isQuiet).toBe(false);
  });
});
```
