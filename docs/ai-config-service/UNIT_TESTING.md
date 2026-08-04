# QAssure AI Config Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit tests isolate the four core components of the AI Config service and mock all external dependencies (PostgreSQL, AI provider SDKs, environment variables).

Components tested in isolation:
1. **`encryption.js`** — Encrypt/decrypt round-trip and masking.
2. **`UpsertConfigSchema` (Zod)** — All validation rules and cross-field refinements.
3. **`TenantAIConfigService`** — Business logic, cache behavior, and response formatting.
4. **`BaseAIProvider`** — Cost calculation, response formatting, option validation.

---

## 2. Test Suite Details

### 2.1 Encryption Utility (`utils/encryption.js`)

**Setup**: Mock `process.env.ENCRYPTION_KEY` with a valid 64-char hex string.

```javascript
beforeEach(() => {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes, valid
});
```

**Test Cases**:

| Case | Input | Expected |
| :--- | :--- | :--- |
| Round-trip | `encrypt('sk-test-key-1234567890')` → `decrypt(result)` | Returns `'sk-test-key-1234567890'` |
| Unique IV per call | `encrypt('same')` called twice | Two different encrypted strings (random IV) |
| Tampered ciphertext | Modify last char of encrypted string → `decrypt()` | Throws error (GCM auth tag fails) |
| Missing ENCRYPTION_KEY | `delete process.env.ENCRYPTION_KEY` → `encrypt('x')` | Throws `"ENCRYPTION_KEY environment variable is not set"` |
| Invalid key length | `ENCRYPTION_KEY = 'abc'` → `encrypt('x')` | Throws `"ENCRYPTION_KEY must be a 64-character hex string"` |
| maskApiKey long key | `maskApiKey('DPm2DIP2XY12345T1NI')` | Returns `"DPm2DIP2...T1NI"` |
| maskApiKey short key | `maskApiKey('short')` | Returns `"****"` |

```javascript
const { encrypt, decrypt, maskApiKey } = require('../src/utils/encryption');

describe('Encryption Utility', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '00'.repeat(32); // 64 hex chars
  });

  it('should encrypt and decrypt correctly', () => {
    const original = 'sk-test-api-key-1234567890';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for same input (random IV)', () => {
    const a = encrypt('same-key');
    const b = encrypt('same-key');
    expect(a).not.toBe(b);
  });

  it('should throw on invalid encrypted format', () => {
    expect(() => decrypt('not-valid-format')).toThrow('Invalid encrypted format');
  });

  it('should mask short keys as ****', () => {
    expect(maskApiKey('short')).toBe('****');
  });

  it('should mask long keys correctly', () => {
    const masked = maskApiKey('sk-abc12345XXXXXXX6789');
    expect(masked).toMatch(/^sk-abc12\.\.\..*$/);
  });
});
```

---

### 2.2 Zod Validation Schemas (`validation/tenant-ai-config.schema.js`)

```javascript
const { UpsertConfigSchema, ProviderParamsSchema, TestConnectionBodySchema } = require('../src/validation/tenant-ai-config.schema');

describe('UpsertConfigSchema', () => {
  const baseValid = {
    provider: 'openai',
    config_type: 'direct',
    api_key: 'sk-valid-key-minimum-10chars'
  };

  it('should pass for a valid direct config', () => {
    const result = UpsertConfigSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('should fail if api_key is too short', () => {
    const result = UpsertConfigSchema.safeParse({ ...baseValid, api_key: 'short' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain('api_key');
  });

  it('should fail for invalid config_type', () => {
    const result = UpsertConfigSchema.safeParse({ ...baseValid, config_type: 'gcp' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain('config_type');
  });

  it('should fail for azure config without endpoint', () => {
    const result = UpsertConfigSchema.safeParse({
      ...baseValid, config_type: 'azure', deployment: 'gpt-4o'
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain('endpoint');
  });

  it('should fail for azure config without deployment', () => {
    const result = UpsertConfigSchema.safeParse({
      ...baseValid, config_type: 'azure', endpoint: 'https://my.openai.azure.com'
    });
    expect(result.success).toBe(false);
  });

  it('should pass valid azure config with endpoint + deployment', () => {
    const result = UpsertConfigSchema.safeParse({
      ...baseValid,
      config_type: 'azure',
      endpoint: 'https://my.openai.azure.com',
      deployment: 'gpt-4o'
    });
    expect(result.success).toBe(true);
  });

  it('should fail open-source provider without endpoint', () => {
    const result = UpsertConfigSchema.safeParse({
      provider: 'Mistral 7B',
      config_type: 'direct',
      api_key: 'some-key-12345'
    });
    expect(result.success).toBe(false);
  });

  it('should fail if custom_pricing has negative value', () => {
    const result = UpsertConfigSchema.safeParse({
      ...baseValid,
      custom_pricing: { 'gpt-4o': { input: -1, output: 0.015 } }
    });
    expect(result.success).toBe(false);
  });

  it('should fail if custom_models exceeds 20 entries', () => {
    const result = UpsertConfigSchema.safeParse({
      ...baseValid,
      custom_models: Array(21).fill('model')
    });
    expect(result.success).toBe(false);
  });
});
```

---

### 2.3 TenantAIConfigService Cache Logic

```javascript
const { TenantAIConfigService } = require('../src/services/tenant-ai-config.service');

// Mock database
jest.mock('../src/config/database', () => ({
  query: jest.fn()
}));

// Mock encryption
jest.mock('../src/utils/encryption', () => ({
  encrypt: jest.fn(v => `enc:${v}`),
  decrypt: jest.fn(v => v.replace('enc:', '')),
  maskApiKey: jest.fn(v => `${v.slice(0, 4)}...${v.slice(-4)}`)
}));

describe('TenantAIConfigService', () => {
  let service;
  const database = require('../src/config/database');

  beforeEach(() => {
    service = new TenantAIConfigService();
    jest.clearAllMocks();
  });

  it('getActiveConfigs() should query DB on first call', async () => {
    database.query.mockResolvedValue({
      rows: [{
        provider: 'openai',
        config_type: 'direct',
        encrypted_api_key: 'enc:sk-real-key-1234567890',
        endpoint: null, deployment: null, api_version: null,
        custom_models: [], custom_pricing: {}, default_model: 'gpt-4o',
        custom_embedding_models: [], default_embedding_model: null,
        fallback_provider: null, cancel_url: null
      }]
    });

    const result = await service.getActiveConfigs('tenant-1');
    expect(database.query).toHaveBeenCalledTimes(1);
    expect(result.has('openai')).toBe(true);
    expect(result.get('openai').apiKey).toBe('sk-real-key-1234567890');
  });

  it('getActiveConfigs() should return cache on second call', async () => {
    database.query.mockResolvedValue({ rows: [] });

    await service.getActiveConfigs('tenant-1');
    await service.getActiveConfigs('tenant-1');

    expect(database.query).toHaveBeenCalledTimes(1);
  });

  it('clearCache() should evict the tenant cache', async () => {
    database.query.mockResolvedValue({ rows: [] });

    await service.getActiveConfigs('tenant-1');
    service.clearCache('tenant-1');
    await service.getActiveConfigs('tenant-1');

    expect(database.query).toHaveBeenCalledTimes(2);
  });

  it('_formatForResponse() should never return raw API key', () => {
    const row = {
      id: 'uuid', tenant_id: 't-1', provider: 'openai',
      config_type: 'direct', display_name: 'Test',
      encrypted_api_key: 'enc:sk-real-key-1234567890',
      endpoint: null, deployment: null, api_version: null,
      custom_models: [], custom_pricing: {}, default_model: 'gpt-4o',
      custom_embedding_models: [], default_embedding_model: null,
      fallback_provider: null, cancel_url: null, is_active: true,
      last_verified_at: null, last_error: null,
      created_at: new Date(), updated_at: new Date()
    };

    const result = service._formatForResponse(row);
    expect(result.api_key_masked).toBeDefined();
    expect(result.api_key).toBeUndefined();
    expect(result.encrypted_api_key).toBeUndefined();
  });
});
```

---

### 2.4 BaseAIProvider Cost Calculation

```javascript
const { BaseAIProvider } = require('../src/infrastructure/ai/base-provider');

describe('BaseAIProvider', () => {
  it('calculateCost returns 0 for BYOK providers', () => {
    const provider = new BaseAIProvider();
    provider.usesTenantApiKey = true;
    provider.pricing = { 'gpt-4o': { input: 0.005, output: 0.015 } };
    expect(provider.calculateCost('gpt-4o', 1000, 500)).toBe(0);
  });

  it('calculateCost returns correct amount for platform keys', () => {
    const provider = new BaseAIProvider();
    provider.usesTenantApiKey = false;
    provider.pricing = { 'gpt-4o': { input: 0.005, output: 0.015 } };
    // 1000 input tokens = 1K * 0.005 = $0.005
    // 500 output tokens = 0.5K * 0.015 = $0.0075
    const cost = provider.calculateCost('gpt-4o', 1000, 500);
    expect(cost).toBeCloseTo(0.0125);
  });

  it('validateOptions rejects empty messages', () => {
    const provider = new BaseAIProvider();
    const errors = provider.validateOptions({ messages: [] });
    expect(errors).toContain('messages cannot be empty');
  });

  it('validateOptions rejects invalid temperature', () => {
    const provider = new BaseAIProvider();
    const errors = provider.validateOptions({
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 3
    });
    expect(errors).toContain('temperature must be between 0 and 2');
  });
});
```
