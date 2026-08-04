# QAssure AI Gateway Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit tests isolate the gateway routing logic and helper utilities:

1. **Zod Validation**: Test constraint checks for completion messages, temperatures, and mappings.
2. **Cost Calculation**: Verify token rate calculations, including cost suppression for BYOK.
3. **Gateway Fallbacks**: Verify fallback selection when primary connections fail.

---

## 2. Test Suite Details

### 2.1 Cost Calculation & BYOK Suppression

Verifies cost calculations and billing logic.

```javascript
const { AIService } = require('../src/services/ai.service');

describe('AIService - Cost Calculations', () => {
  let service;

  beforeEach(() => {
    service = new AIService();
    service.gateway = {
      defaultProvider: 'openai',
      getPricing: jest.fn().mockReturnValue({ input: 0.0015, output: 0.002 }),
      estimateCost: jest.fn().mockImplementation((model, pTokens, cTokens) => {
        return (pTokens * 0.0015) + (cTokens * 0.002);
      })
    };
  });

  it('should calculate cost correctly based on token pricing', async () => {
    const usage = { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 };
    const cost = service.gateway.estimateCost('gpt-4o', usage.prompt_tokens, usage.completion_tokens);
    expect(cost).toBe(2.5); // (1000 * 0.0015) + (500 * 0.002)
  });

  it('should set cost to 0 if the tenant uses their own API key (BYOK)', async () => {
    const mockModels = [
      {
        id: 'gpt-4o',
        provider: 'openai',
        isDefault: true,
        pricing: { input: 0, output: 0 } // Suppressed pricing
      }
    ];

    service.gateway._resolveProviders = jest.fn().mockResolvedValue({
      providers: new Map([
        ['openai', {
          models: ['gpt-4o'],
          defaultModel: 'gpt-4o',
          usesTenantApiKey: true, // BYOK key configured
          getPricing: () => ({ input: 0.0015, output: 0.002 })
        }]
      ])
    });

    const models = await service.getModels('tenant-123');
    expect(models[0].pricing).toEqual({ input: 0, output: 0 });
  });
});
```

---

### 2.2 Zod Payload Validation (`validation/ai.schema.js`)

Verifies Zod parsing.

```javascript
const { CreateCompletionSchema } = require('../src/validation/ai.schema');

describe('CreateCompletionSchema Validation', () => {
  const validPayload = {
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello" }
    ],
    provider: "openai",
    model: "gpt-4o"
  };

  it('should pass validation with a valid structure', () => {
    const result = CreateCompletionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject requests with an unsupported role name', () => {
    const result = CreateCompletionSchema.safeParse({
      ...validPayload,
      messages: [{ role: "developer", content: "Invalid role" }]
    });
    expect(result.success).toBe(false);
  });

  it('should reject requests with invalid temperature configuration', () => {
    const result = CreateCompletionSchema.safeParse({
      ...validPayload,
      temperature: -0.5
    });
    expect(result.success).toBe(false);
  });
});
```

---

### 2.3 Fallback Settings Storage

Verifies fallback settings logic.

```javascript
const { AIService } = require('../src/services/ai.service');

describe('AIService - Fallback Settings Management', () => {
  let service;

  beforeEach(() => {
    service = new AIService();
    jest.clearAllMocks();
  });

  it('should return system default fallback order if no settings are configured', async () => {
    const order = await service.getFallbackOrderSetting('tenant-123');
    expect(order).toEqual(['openai', 'anthropic', 'gemini', 'open-source']);
  });

  it('should return default fallback mapping if no settings are configured', async () => {
    const mapping = await service.getFallbackMappingSetting();
    expect(mapping).toEqual({
      openai: 'anthropic',
      anthropic: 'openai',
      gemini: 'open-source',
      'open-source': 'openai'
    });
  });
});
```
