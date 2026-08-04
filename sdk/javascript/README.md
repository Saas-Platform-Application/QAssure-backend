# QAssure JavaScript SDK

Official JavaScript/Node.js SDK for the QAssure Platform API.

## Installation
```bash
npm install @qassure/sdk
```

## Quick Start
```javascript
const { QAssureClient } = require('@qassure/sdk');

// Initialize client
const client = new QAssureClient({
  baseUrl: 'https://api.qassure.ai',
  tenantId: 'your-tenant-id'
});

// Login
await client.login('user@example.com', 'password');

// List modules
const modules = await client.listModules();
console.log(modules.data);

// Register a new module
const newModule = await client.registerModule({
  module_id: 'my-module',
  name: 'My Custom Module',
  version: '1.0.0',
  base_url: 'http://my-module:3001',
  health_endpoint: '/health'
});

// Start the module
await client.startModule(newModule.data.id);

// Check health
const health = await client.checkModuleHealth(newModule.data.id);
console.log(health.data.status);
```

## WebSocket Connection
```javascript
const ws = client.connectWebSocket({
  onOpen: () => console.log('Connected'),
  onMessage: (data) => console.log('Received:', data),
  onError: (err) => console.error('Error:', err),
  onClose: () => console.log('Disconnected')
});
```

## API Reference

### Authentication
- `login(email, password)` - Authenticate user
- `logout()` - End session
- `setToken(accessToken, refreshToken)` - Set tokens manually

### Modules
- `listModules(params)` - List all modules
- `getModule(id)` - Get module by ID
- `registerModule(data)` - Register new module
- `startModule(id)` - Start a module
- `stopModule(id, reason)` - Stop a module
- `restartModule(id, reason)` - Restart a module
- `checkModuleHealth(id)` - Check module health

### Documents, CAPAs, Training, Suppliers
See TypeScript definitions for full API.

## License

MIT
