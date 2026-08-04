/**
 * AI Controller - QAssure Platform
 * HTTP handlers for AI endpoints
 */
const { getAIService } = require("../services/ai.service");

const aiService = getAIService();

/**
 * Create a completion
 * POST /api/v1/ai/completions
 */
const createCompletion = async (req, res) => {
  try {
    const { messages, model, provider, temperature, max_tokens, top_p, stop } =
      req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "messages array is required and cannot be empty",
        },
      });
    }

    const result = await aiService.createCompletion(
      { messages, model, provider, temperature, max_tokens, top_p, stop },
      {
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        correlationId: req.correlationId,
        req,
      },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[AIController] createCompletion error:", error.message);

    const statusCode =
      error.code === "RATE_LIMITED"
        ? 429
        : error.code === "AUTH_FAILED"
          ? 401
          : error.code === "NO_PROVIDERS"
            ? 503
            : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || "AI_ERROR",
        message: error.message,
        provider: error.provider,
      },
    });
  }
};

/**
 * Get completion by ID
 * GET /api/v1/ai/completions/:id
 */
const getCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const completion = await aiService.getCompletion(id, tenantId);

    if (!completion) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Completion not found",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: completion,
    });
  } catch (error) {
    console.error("[AIController] getCompletion error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * List completions
 * GET /api/v1/ai/completions
 */
const normalizeDateBoundary = (value, endOfDay) => {
  if (!value || typeof value !== "string") return value;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (m) {
    return endOfDay ? `${m[1]}T23:59:59.999Z` : `${m[1]}T00:00:00.000Z`;
  }
  return value;
};

const listCompletions = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const {
      page = 1,
      limit = 20,
      provider,
      model,
      user_id,
      module_id,
      start_date,
      end_date,
      status,
    } = req.query;

    const result = await aiService.listCompletions(tenantId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      provider,
      model,
      userId: user_id,
      moduleId: module_id,
      startDate: normalizeDateBoundary(start_date, false),
      endDate: normalizeDateBoundary(end_date, true),
      status,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[AIController] listCompletions error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get available providers
 * GET /api/v1/ai/providers
 */
const getProviders = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const providers = await aiService.getProviders(tenantId);

    res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.error("[AIController] getProviders error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get provider health
 * GET /api/v1/ai/providers/:provider/health
 */
const getProviderHealth = async (req, res) => {
  try {
    const { provider } = req.params;
    const tenantId = req.user?.tenantId;
    const health = await aiService.getProviderHealth(provider, tenantId);

    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error("[AIController] getProviderHealth error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get all providers health
 * GET /api/v1/ai/health
 */
const getHealthStatus = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const health = await aiService.getProviderHealth(null, tenantId);

    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error("[AIController] getHealthStatus error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get available models
 * GET /api/v1/ai/models
 */
const getModels = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const models = await aiService.getModels(tenantId);

    res.status(200).json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error("[AIController] getModels error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get cost summary
 * GET /api/v1/ai/costs
 */
const getCostSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { start_date, end_date, group_by } = req.query;

    const costs = await aiService.getCostSummary(tenantId, {
      startDate: start_date,
      endDate: end_date,
      groupBy: group_by,
    });

    res.status(200).json({
      success: true,
      data: costs,
    });
  } catch (error) {
    console.error("[AIController] getCostSummary error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Playground - test prompts without saving
 * POST /api/v1/ai/playground
 */
const playground = async (req, res) => {
  try {
    const { messages, model, provider, temperature, max_tokens } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "messages array is required",
        },
      });
    }

    // Use gateway directly without tracking
    const { getAIGateway } = require("../infrastructure/ai/gateway.service");
    const gateway = getAIGateway();
    await gateway.initialize();

    console.log(
      `[AIController] Playground request - Provider: ${provider}, Tenant: ${req.user?.tenantId}`,
    );
    const result = await gateway.createCompletion(
      {
        messages,
        model,
        provider,
        temperature,
        max_tokens,
      },
      {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
        req,
      },
    );

    res.status(200).json({
      success: true,
      data: {
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        cost: result.cost,
        latency_ms: result.latency_ms,
        fallbackUsed: result.fallbackUsed || false,
      },
    });
  } catch (error) {
    console.error("[AIController] playground error:", error.message);
    res.status(500).json({
      success: false,
      error: {
        code: error.code || "AI_ERROR",
        message: error.message,
      },
    });
  }
};

/**
 * List fallback occurrences
 * GET /api/v1/ai/fallbacks
 */
const listFallbacks = async (req, res) => {
  try {
    const isSuperAdmin =
      req.user?.role === "super_admin" ||
      req.user?.roles?.includes("super_admin");
    const tenantId = isSuperAdmin
      ? req.query.tenant_id || null
      : req.user?.tenantId;
    const { page = 1, limit = 20 } = req.query;

    const result = await aiService.listFallbacks(tenantId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[AIController] listFallbacks error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get configured fallback order
 * GET /api/v1/ai/fallback-order
 */
const getFallbackOrderSetting = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const order = await aiService.getFallbackOrderSetting(tenantId);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(
      "[AIController] getFallbackOrderSetting error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Update fallback order setting
 * POST /api/v1/ai/fallback-order
 */
const updateFallbackOrderSetting = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { fallback_order } = req.body;

    const order = await aiService.updateFallbackOrderSetting(
      tenantId,
      fallback_order,
      req.user?.id,
    );
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(
      "[AIController] updateFallbackOrderSetting error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get per-provider fallback mapping
 * GET /api/v1/ai/fallback-mapping
 */
const getFallbackMappingSetting = async (req, res) => {
  try {
    const mapping = await aiService.getFallbackMappingSetting();
    res.status(200).json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    console.error(
      "[AIController] getFallbackMappingSetting error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Update per-provider fallback mapping
 * POST /api/v1/ai/fallback-mapping
 */
const updateFallbackMappingSetting = async (req, res) => {
  try {
    const { mapping } = req.body;
    const result = await aiService.updateFallbackMappingSetting(
      mapping,
      req.user?.id,
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "[AIController] updateFallbackMappingSetting error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

module.exports = {
  createCompletion,
  getCompletion,
  listCompletions,
  getProviders,
  getProviderHealth,
  getHealthStatus,
  getModels,
  getCostSummary,
  playground,
  listFallbacks,
  getFallbackOrderSetting,
  updateFallbackOrderSetting,
  getFallbackMappingSetting,
  updateFallbackMappingSetting,
};
