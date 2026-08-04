# QAssure Prompt Management Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit tests isolate the prompt management business logic by mocking external dependencies (PostgreSQL pool, document parsing libraries, and the AI Gateway integration).

Mocking boundaries:
1. **PostgreSQL Client**: Mock the database response to verify query generation.
2. **AI Gateway**: Mock streaming and standard completions.
3. **Execution Registry**: Test the registration, association, and cancellation of abort controllers.
4. **Zod Validation**: Test payload schema limits and edge cases.

---

## 2. Test Suite Details

### 2.1 Template Interpolation Engine

Tests variables resolution, defaults, and error conditions.

```javascript
const { PromptService } = require('../src/services/prompt.service');

describe('PromptService - Interpolation Logic', () => {
  let service;
  
  beforeEach(() => {
    service = new PromptService();
  });

  it('should correctly interpolate variables into placeholders', () => {
    const template = "Hello {{user_name}}, welcome to {{project_name}}.";
    const variables = [
      { name: "user_name", required: true },
      { name: "project_name", required: false, default: "QAssure" }
    ];
    
    // Inject mock prompt getById behavior
    service.getById = jest.fn().mockResolvedValue({
      template,
      variables,
      status: 'active'
    });

    // Mock Gateway completion call
    const mockGateway = {
      createCompletion: jest.fn().mockResolvedValue({ content: 'Mocked output' }),
      defaultProvider: 'openai',
      estimateCost: jest.fn().mockReturnValue(0)
    };
    service._getGateway = jest.fn().mockResolvedValue(mockGateway);

    // Call execute
    service.execute('prompt-123', { user_name: 'John' }, { tenantId: 'tenant-1' });
    
    // Check that messages array received the interpolated string
    expect(mockGateway.createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: "Hello John, welcome to QAssure."
          })
        ])
      }),
      expect.any(Object)
    );
  });

  it('should throw an error if a required variable is missing', async () => {
    const template = "User: {{user_id}}";
    const variables = [{ name: "user_id", required: true }];
    
    service.getById = jest.fn().mockResolvedValue({
      template,
      variables,
      status: 'active'
    });

    await expect(
      service.execute('prompt-123', {}, { tenantId: 'tenant-1' })
    ).rejects.toThrow("Required variable missing: user_id");
  });
});
```

---

### 2.2 Execution Registry (`execution-registry.service.js`)

Verifies memory cleanup and remote cancellation triggers.

```javascript
const { executionRegistry } = require('../src/services/execution-registry.service');
const axios = require('axios');

jest.mock('axios');

describe('ExecutionRegistry Unit Tests', () => {
  beforeEach(() => {
    executionRegistry.activeExecutions.clear();
    jest.clearAllMocks();
  });

  it('should register and retrieve an execution entry', () => {
    const mockAbortController = { abort: jest.fn() };
    executionRegistry.register('client-id-123', mockAbortController);

    const entry = executionRegistry.activeExecutions.get('client-id-123');
    expect(entry).toBeDefined();
    expect(entry.abortController).toBe(mockAbortController);
  });

  it('should associate a remote request ID with the client request ID', () => {
    const mockAbortController = { abort: jest.fn() };
    executionRegistry.register('client-id-123', mockAbortController);
    executionRegistry.associateRemoteId('client-id-123', 'remote-id-456');

    // Both keys should point to the same execution entry
    const entryByClient = executionRegistry.activeExecutions.get('client-id-123');
    const entryByRemote = executionRegistry.activeExecutions.get('remote-id-456');

    expect(entryByClient).toBe(entryByRemote);
    expect(entryByClient.remoteRequestId).toBe('remote-id-456');
  });

  it('should abort local controller and call remote cancel URL if registered', async () => {
    const mockAbortController = { abort: jest.fn() };
    executionRegistry.register('client-id-123', mockAbortController, {
      cancelUrl: 'http://vllm-engine/cancel',
      apiKey: 'test-api-key'
    });
    executionRegistry.associateRemoteId('client-id-123', 'remote-id-456');

    axios.post.mockResolvedValue({ status: 200 });

    const result = await executionRegistry.cancel('client-id-123');

    expect(result).toBe(true);
    expect(mockAbortController.abort).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      'http://vllm-engine/cancel',
      { request_id: 'remote-id-456' },
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key'
        })
      })
    );

    // Verify cleanup
    expect(executionRegistry.activeExecutions.has('client-id-123')).toBe(false);
    expect(executionRegistry.activeExecutions.has('remote-id-456')).toBe(false);
  });
});
```

---

### 2.3 Route Payload Validation (`validation/prompt.schema.js`)

Verifies Zod validations.

```javascript
const { CreatePromptSchema } = require('../src/validation/prompt.schema');

describe('CreatePromptSchema Validation', () => {
  const validPayload = {
    name: "Standard Classifier",
    use_case: "classify",
    user_template: "Classify this message: {{message}}"
  };

  it('should pass validation with minimum required fields', () => {
    const result = CreatePromptSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject inputs with empty user_template', () => {
    const result = CreatePromptSchema.safeParse({
      ...validPayload,
      user_template: ""
    });
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe("User template is required");
  });

  it('should reject inputs with invalid temperature configuration', () => {
    const result = CreatePromptSchema.safeParse({
      ...validPayload,
      temperature: 2.5
    });
    expect(result.success).toBe(false);
    expect(result.error.errors[0].path).toContain('temperature');
  });

  it('should reject custom variables containing invalid parameters', () => {
    const result = CreatePromptSchema.safeParse({
      ...validPayload,
      variables: [
        { name: "message", type: "object" } // invalid enum type
      ]
    });
    expect(result.success).toBe(false);
  });
});
```
