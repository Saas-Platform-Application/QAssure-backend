/**
 * Prompt Controller - QAssure Platform
 * HTTP handlers for prompt management endpoints
 */
const crypto = require("crypto");
const { getPromptService } = require("../services/prompt.service");
const { executionRegistry } = require("../services/execution-registry.service");

const promptService = getPromptService();

// ==================== CRUD ====================

/**
 * Create prompt
 * POST /api/v1/ai/prompts
 */
const create = async (req, res) => {
  try {
    const {
      name,
      description,
      use_case,
      system_message,
      user_template,
      model,
      provider,
      temperature,
      max_tokens,
      variables,
      tags,
      is_default,
    } = req.body;

    const sourceModuleId = req.user?.moduleId || req.module?.id;
    let moduleIds = null;

    if (sourceModuleId) {
      moduleIds = [sourceModuleId];
    } else if (req.body.module_ids) {
      moduleIds = Array.isArray(req.body.module_ids)
        ? req.body.module_ids
        : [req.body.module_ids];
    } else if (req.body.module_id) {
      moduleIds = [req.body.module_id];
    }

    const prompt = await promptService.create(
      {
        name,
        description,
        useCase: use_case,
        systemMessage: system_message,
        template: user_template,
        tags,
        variables,
        isDefault: is_default,
        moduleIds,
        defaultParameters: {
          ...(model && { model }),
          ...(provider && { provider }),
          ...(temperature !== undefined && { temperature }),
          ...(max_tokens !== undefined && { max_tokens }),
        },
      },
      {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      },
    );

    res.status(201).json({ success: true, data: prompt });
  } catch (error) {
    console.error("[PromptController] create error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get prompt by ID
 * GET /api/v1/ai/prompts/:id
 */
const getById = async (req, res) => {
  try {
    const prompt = await promptService.getById(
      req.params.id,
      req.user?.tenantId,
    );

    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Prompt not found" },
      });
    }

    res.status(200).json({ success: true, data: prompt });
  } catch (error) {
    console.error("[PromptController] getById error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * List prompts
 * GET /api/v1/ai/prompts
 */
const list = async (req, res) => {
  try {
    const { page, limit, use_case, status, search, tags, module_id } = req.query;
    const filterModuleId = req.user?.moduleId || req.module?.id || module_id || req.params?.module_id;

    const result = await promptService.list(req.user?.tenantId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      useCase: use_case,
      status,
      search,
      tags: tags ? tags.split(",") : undefined,
      moduleId: filterModuleId || undefined,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("[PromptController] list error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Update prompt
 * PUT /api/v1/ai/prompts/:id
 */
const update = async (req, res) => {
  try {
    const {
      name,
      description,
      use_case,
      system_message,
      user_template,
      model,
      provider,
      temperature,
      max_tokens,
      variables,
      tags,
      is_default,
      change_notes,
    } = req.body;

    const sourceModuleId = req.user?.moduleId || req.module?.id;
    let moduleIds = undefined;

    if (sourceModuleId) {
      moduleIds = [sourceModuleId];
    } else if (req.body.module_ids !== undefined) {
      moduleIds = Array.isArray(req.body.module_ids)
        ? req.body.module_ids
        : [req.body.module_ids];
    } else if (req.body.module_id !== undefined) {
      moduleIds = [req.body.module_id];
    }

    const prompt = await promptService.update(
      req.params.id,
      req.user?.tenantId,
      {
        name,
        description,
        useCase: use_case,
        systemMessage: system_message,
        template: user_template,
        tags,
        variables,
        isDefault: is_default,
        changeNotes: change_notes,
        moduleIds,
        defaultParameters: {
          ...(model && { model }),
          ...(provider && { provider }),
          ...(temperature !== undefined && { temperature }),
          ...(max_tokens !== undefined && { max_tokens }),
        },
      },
      { userId: req.user?.id },
    );

    res.status(200).json({ success: true, data: prompt });
  } catch (error) {
    console.error("[PromptController] update error:", error.message);

    if (error.message === "Prompt not found") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: error.message },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Update prompt status
 * PATCH /api/v1/ai/prompts/:id/status
 */
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "Status is required" },
      });
    }

    const prompt = await promptService.updateStatus(
      req.params.id,
      req.user?.tenantId,
      status,
      req.user?.id,
    );

    res.status(200).json({ success: true, data: prompt });
  } catch (error) {
    console.error("[PromptController] updateStatus error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Delete prompt
 * DELETE /api/v1/ai/prompts/:id
 */
const remove = async (req, res) => {
  try {
    await promptService.delete(req.params.id, req.user?.tenantId);
    res.status(200).json({ success: true, message: "Prompt deleted" });
  } catch (error) {
    console.error("[PromptController] delete error:", error.message);

    if (error.message === "Prompt not found") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: error.message },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Clone prompt
 * POST /api/v1/ai/prompts/:id/clone
 */
const clone = async (req, res) => {
  try {
    const { name } = req.body;

    const prompt = await promptService.clone(
      req.params.id,
      req.user?.tenantId,
      name,
      req.user?.id,
    );

    res.status(201).json({ success: true, data: prompt });
  } catch (error) {
    console.error("[PromptController] clone error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

// ==================== Versions ====================

/**
 * Get version history
 * GET /api/v1/ai/prompts/:id/versions
 */
const getVersions = async (req, res) => {
  try {
    const versions = await promptService.getVersions(
      req.params.id,
      req.user?.tenantId,
    );

    res.status(200).json({ success: true, data: versions });
  } catch (error) {
    console.error("[PromptController] getVersions error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get specific version
 * GET /api/v1/ai/prompts/:id/versions/:version
 */
const getVersion = async (req, res) => {
  try {
    const version = await promptService.getVersion(
      req.params.id,
      parseInt(req.params.version),
      req.user?.tenantId,
    );

    if (!version) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Version not found" },
      });
    }

    res.status(200).json({ success: true, data: version });
  } catch (error) {
    console.error("[PromptController] getVersion error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Rollback to version
 * POST /api/v1/ai/prompts/:id/rollback
 */
const rollback = async (req, res) => {
  try {
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "Version is required" },
      });
    }

    const prompt = await promptService.rollback(
      req.params.id,
      parseInt(version),
      req.user?.tenantId,
      req.user?.id,
    );

    res.status(200).json({ success: true, data: prompt });
  } catch (error) {
    console.error("[PromptController] rollback error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

// ==================== Execution ====================

/**
 * Execute prompt
 * POST /api/v1/ai/prompts/:id/execute
 */
const execute = async (req, res) => {
  try {
    const { variables, stream, provider, model, temperature, max_tokens, clientRequestId, client_request_id } = req.body;
    const cRequestId = clientRequestId || client_request_id || crypto.randomUUID();

    if (stream) {
      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      // Write clientRequestId as first SSE event so frontend knows it immediately
      res.write(`data: ${JSON.stringify({ clientRequestId: cRequestId })}\n\n`);
      if (typeof res.flush === "function") {
        res.flush();
      }

      const result = await promptService.execute(
        req.params.id,
        variables || {},
        {
          tenantId: req.user?.tenantId,
          userId: req.user?.id,
          stream: true,
          onChunk: (chunk) => {
            res.write(`data: ${JSON.stringify({ ...chunk })}\n\n`);
            if (typeof res.flush === "function") {
              res.flush();
            }
          },
          provider,
          model,
          temperature,
          max_tokens,
          clientRequestId: cRequestId,
        }
      );

      res.write(`data: ${JSON.stringify({ done: true, metadata: result })}\n\n`);
      if (typeof res.flush === "function") {
        res.flush();
      }
      res.end();
    } else {
      const result = await promptService.execute(
        req.params.id,
        variables || {},
        {
          tenantId: req.user?.tenantId,
          userId: req.user?.id,
          provider,
          model,
          temperature,
          max_tokens,
          clientRequestId: cRequestId,
        }
      );

      res.status(200).json({ success: true, data: result });
    }
  } catch (error) {
    console.error("[PromptController] execute error:", error.message);
    if (req.body.stream) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      if (typeof res.flush === "function") {
        res.flush();
      }
      res.end();
    } else {
      res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: error.message },
      });
    }
  }
};

/**
 * Execute prompt with file upload (multimodal)
 * POST /api/v1/ai/prompts/:id/execute-with-file
 */
const executeWithFile = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message:
            'File is required. Upload via multipart/form-data with field name "file".',
        },
      });
    }

    // Variables come as JSON string in multipart form
    let variables = {};
    if (req.body.variables) {
      try {
        variables =
          typeof req.body.variables === "string"
            ? JSON.parse(req.body.variables)
            : req.body.variables;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Variables must be valid JSON",
          },
        });
      }
    }

    const stream = req.body.stream === true || req.body.stream === "true";
    const provider = req.body.provider;
    const model = req.body.model;

    let temperature = req.body.temperature;
    if (temperature !== undefined && temperature !== null && temperature !== "") {
      temperature = parseFloat(temperature);
    } else {
      temperature = undefined;
    }

    let max_tokens = req.body.max_tokens || req.body.maxTokens;
    if (max_tokens !== undefined && max_tokens !== null && max_tokens !== "") {
      max_tokens = parseInt(max_tokens, 10);
    } else {
      max_tokens = undefined;
    }

    const clientRequestId = req.body.clientRequestId || req.body.client_request_id || crypto.randomUUID();

    if (stream) {
      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      // Write clientRequestId as first SSE event so frontend knows it immediately
      res.write(`data: ${JSON.stringify({ clientRequestId })}\n\n`);
      if (typeof res.flush === "function") {
        res.flush();
      }

      const result = await promptService.executeWithFile(
        req.params.id,
        file.buffer,
        file.originalname,
        file.mimetype,
        variables,
        {
          tenantId: req.user?.tenantId,
          userId: req.user?.id,
          stream: true,
          onChunk: (chunk) => {
            res.write(`data: ${JSON.stringify({ ...chunk })}\n\n`);
            if (typeof res.flush === "function") {
              res.flush();
            }
          },
          provider,
          model,
          temperature,
          max_tokens,
          clientRequestId,
        }
      );

      res.write(`data: ${JSON.stringify({ done: true, metadata: result })}\n\n`);
      if (typeof res.flush === "function") {
        res.flush();
      }
      res.end();
    } else {
      const result = await promptService.executeWithFile(
        req.params.id,
        file.buffer,
        file.originalname,
        file.mimetype,
        variables,
        {
          tenantId: req.user?.tenantId,
          userId: req.user?.id,
          provider,
          model,
          temperature,
          max_tokens,
          clientRequestId,
        },
      );

      res.status(200).json({ success: true, data: result });
    }
  } catch (error) {
    console.error("[PromptController] executeWithFile error:", error.message);

    if (req.body.stream === true || req.body.stream === "true") {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      if (typeof res.flush === "function") {
        res.flush();
      }
      res.end();
    } else {
      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: error.message },
        });
      }

      if (
        error.message.includes("not active") ||
        error.message.includes("Unsupported file type")
      ) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: error.message },
        });
      }

      res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: error.message },
      });
    }
  }
};

/**
 * Test prompt (playground)
 * POST /api/v1/ai/prompts/:id/test
 */
const test = async (req, res) => {
  try {
    const { variables, model, provider, temperature, max_tokens } = req.body;

    const result = await promptService.test(
      req.params.id,
      variables || {},
      { model, provider, temperature, max_tokens },
      {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      },
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("[PromptController] test error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

// ==================== Test Cases ====================

/**
 * Create test case
 * POST /api/v1/ai/prompts/:id/test-cases
 */
const createTestCase = async (req, res) => {
  try {
    const {
      name,
      description,
      variables,
      expected_output,
      expected_contains,
      max_tokens,
      tags,
    } = req.body;

    const testCase = await promptService.createTestCase(
      req.params.id,
      {
        name,
        description,
        inputVariables: variables || {},
        expectedOutput: expected_output,
        expectedContains: expected_contains,
        maxTokens: max_tokens,
        tags,
      },
      {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
      },
    );

    res.status(201).json({ success: true, data: testCase });
  } catch (error) {
    console.error("[PromptController] createTestCase error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * List test cases
 * GET /api/v1/ai/prompts/:id/test-cases
 */
const listTestCases = async (req, res) => {
  try {
    const testCases = await promptService.listTestCases(
      req.params.id,
      req.user?.tenantId,
    );

    res.status(200).json({ success: true, data: testCases });
  } catch (error) {
    console.error("[PromptController] listTestCases error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Run test case
 * POST /api/v1/ai/prompts/test-cases/:testCaseId/run
 */
const runTestCase = async (req, res) => {
  try {
    const result = await promptService.runTestCase(req.params.testCaseId, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("[PromptController] runTestCase error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get test results
 * GET /api/v1/ai/prompts/test-cases/:testCaseId/results
 */
const getTestResults = async (req, res) => {
  try {
    const { limit } = req.query;

    const results = await promptService.getTestResults(
      req.params.testCaseId,
      req.user?.tenantId,
      { limit: parseInt(limit) || 10 },
    );

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("[PromptController] getTestResults error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get execution history for prompt template
 * GET /api/v1/ai/prompts/:id/executions
 */
const getExecutions = async (req, res) => {
  try {
    const { page, limit, status } = req.query;

    const result = await promptService.getExecutions(
      req.params.id,
      req.user?.tenantId,
      {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status: status || undefined,
      }
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("[PromptController] getExecutions error:", error.message);
    if (error.message === "Prompt not found") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: error.message },
      });
    }
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Cancel prompt execution
 * POST /api/v1/ai/prompts/:id/cancel
 */
const cancelExecution = async (req, res) => {
  try {
    const { request_id } = req.body;
    console.log(`[PromptController] Received cancel request for ID: "${request_id}"`);
    const cancelled = await executionRegistry.cancel(request_id);
    if (cancelled) {
      return res.status(200).json({ success: true, message: "Execution cancelled successfully" });
    } else {
      console.log(`[PromptController] Cancel failed: No active execution found for ID: "${request_id}"`);
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "No active execution found with that request ID" }
      });
    }
  } catch (error) {
    console.error("[PromptController] cancelExecution error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message }
    });
  }
};

module.exports = {
  create,
  getById,
  list,
  update,
  updateStatus,
  remove,
  clone,
  getVersions,
  getVersion,
  rollback,
  execute,
  executeWithFile,
  test,
  createTestCase,
  listTestCases,
  runTestCase,
  getTestResults,
  getExecutions,
  cancelExecution,
};
