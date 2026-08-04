/**
 * Prompt Service - QAssure Platform
 * Manages prompt templates, versioning, testing, and execution
 */
const crypto = require("crypto");
const database = require("../config/database");
const { getAIGateway } = require("../infrastructure/ai/gateway.service");
const { executionRegistry } = require("./execution-registry.service");

class PromptService {
  constructor() {
    this.gateway = null;
  }

  async _getGateway() {
    if (!this.gateway) {
      this.gateway = getAIGateway();
      await this.gateway.initialize();
    }
    return this.gateway;
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new prompt template
   */
  async create(data, context = {}) {
    const { tenantId, userId } = context;
    const {
      name,
      description,
      useCase,
      template,
      systemMessage,
      variables = [],
      defaultParameters = {},
      recommendedModels = [],
      tags = [],
      isDefault = false,
      moduleIds = null,
    } = data;

    const id = crypto.randomUUID();

    // If setting as default, unset other defaults for this use case
    if (isDefault) {
      await database.query(
        `
        UPDATE ai_prompt_templates
        SET is_default = false, updated_at = NOW()
        WHERE tenant_id = $1 AND use_case = $2 AND is_default = true
      `,
        [tenantId, useCase],
      );
    }

    const query = `
      INSERT INTO ai_prompt_templates (
        id, tenant_id, name, description, use_case, version,
        template, system_message, variables, default_parameters,
        recommended_models, status, is_default, usage_count,
        tags, created_by, module_ids, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, 'draft', $11, 0, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      id,
      tenantId,
      name,
      description,
      useCase,
      template,
      systemMessage,
      JSON.stringify(variables),
      JSON.stringify(defaultParameters),
      JSON.stringify(recommendedModels),
      isDefault,
      JSON.stringify(tags),
      userId,
      moduleIds,
    ]);

    // Create initial version record
    await this._createVersionRecord(
      id,
      1,
      template,
      systemMessage,
      variables,
      defaultParameters,
      "Initial version",
      userId,
    );

    return this._formatPrompt(result.rows[0]);
  }

  /**
   * Get prompt by ID
   */
  async getById(id, tenantId) {
    const query = `
      SELECT * FROM ai_prompt_templates
      WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
    `;
    const result = await database.query(query, [id, tenantId]);

    if (result.rows.length === 0) return null;
    return this._formatPrompt(result.rows[0]);
  }

  /**
   * List prompts with filters
   */
  async list(tenantId, options = {}) {
    const { page = 1, limit = 20, useCase, status, search, tags, moduleId } = options;

    const offset = (page - 1) * limit;
    const params = [tenantId];
    let paramIndex = 1;

    let whereClause = `WHERE (tenant_id = $${paramIndex} OR tenant_id IS NULL)`;

    if (useCase) {
      paramIndex++;
      whereClause += ` AND use_case = $${paramIndex}`;
      params.push(useCase);
    }

    if (status) {
      paramIndex++;
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
    }

    if (search) {
      paramIndex++;
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
    }

    if (tags && tags.length > 0) {
      paramIndex++;
      whereClause += ` AND tags ?| $${paramIndex}`;
      params.push(tags);
    }

    if (moduleId) {
      paramIndex++;
      whereClause += ` AND $${paramIndex} = ANY(module_ids)`;
      params.push(moduleId);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ai_prompt_templates ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    params.push(limit, offset);
    const dataQuery = `
      SELECT * FROM ai_prompt_templates
      ${whereClause}
      ORDER BY is_default DESC, usage_count DESC, created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    const result = await database.query(dataQuery, params);

    return {
      data: result.rows.map((r) => this._formatPrompt(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update prompt template (creates new version)
   */
  async update(id, tenantId, data, context = {}) {
    const { userId } = context;
    const existing = await this.getById(id, tenantId);

    if (!existing) {
      throw new Error("Prompt not found");
    }

    const {
      name,
      description,
      template,
      systemMessage,
      variables,
      defaultParameters,
      recommendedModels,
      tags,
      isDefault,
      changeNotes,
      moduleIds,
    } = data;

    // Determine if template changed (requires new version)
    const templateChanged = template && template !== existing.template;
    const newVersion = templateChanged
      ? existing.version + 1
      : existing.version;

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await database.query(
        `
        UPDATE ai_prompt_templates
        SET is_default = false, updated_at = NOW()
        WHERE tenant_id = $1 AND use_case = $2 AND is_default = true AND id != $3
      `,
        [tenantId, existing.useCase, id],
      );
    }

    const updates = [];
    const params = [];
    let paramIndex = 0;

    if (name !== undefined) {
      paramIndex++;
      updates.push(`name = $${paramIndex}`);
      params.push(name);
    }

    if (description !== undefined) {
      paramIndex++;
      updates.push(`description = $${paramIndex}`);
      params.push(description);
    }

    if (template !== undefined) {
      paramIndex++;
      updates.push(`template = $${paramIndex}`);
      params.push(template);
    }

    if (systemMessage !== undefined) {
      paramIndex++;
      updates.push(`system_message = $${paramIndex}`);
      params.push(systemMessage);
    }

    if (variables !== undefined) {
      paramIndex++;
      updates.push(`variables = $${paramIndex}`);
      params.push(JSON.stringify(variables));
    }

    if (defaultParameters !== undefined && Object.keys(defaultParameters).length > 0) {
      paramIndex++;
      updates.push(`default_parameters = $${paramIndex}`);
      // Merge with existing default parameters to avoid losing missing fields
      const mergedParameters = {
        ...(existing.defaultParameters || {}),
        ...defaultParameters,
      };

      params.push(JSON.stringify(mergedParameters));
    }

    if (recommendedModels !== undefined) {
      paramIndex++;
      updates.push(`recommended_models = $${paramIndex}`);
      params.push(JSON.stringify(recommendedModels));
    }

    if (tags !== undefined) {
      paramIndex++;
      updates.push(`tags = $${paramIndex}`);
      params.push(JSON.stringify(tags));
    }

    if (isDefault !== undefined) {
      paramIndex++;
      updates.push(`is_default = $${paramIndex}`);
      params.push(isDefault);
    }

    if (templateChanged) {
      paramIndex++;
      updates.push(`version = $${paramIndex}`);
      params.push(newVersion);
    }

    if (moduleIds !== undefined) {
      paramIndex++;
      updates.push(`module_ids = $${paramIndex}`);
      params.push(moduleIds);
    }

    paramIndex++;
    updates.push(`updated_by = $${paramIndex}`);
    params.push(userId);

    updates.push(`updated_at = NOW()`);

    params.push(id, tenantId);

    const query = `
      UPDATE ai_prompt_templates
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
      RETURNING *
    `;

    const result = await database.query(query, params);

    // Create version record if template changed
    if (templateChanged) {
      await this._createVersionRecord(
        id,
        newVersion,
        template || existing.template,
        systemMessage !== undefined ? systemMessage : existing.systemMessage,
        variables || existing.variables,
        defaultParameters || existing.defaultParameters,
        changeNotes || "Updated template",
        userId,
      );
    }

    return this._formatPrompt(result.rows[0]);
  }

  /**
   * Update prompt status
   */
  async updateStatus(id, tenantId, status, userId) {
    const validStatuses = ["draft", "active", "deprecated", "archived"];
    if (!validStatuses.includes(status)) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    const query = `
      UPDATE ai_prompt_templates
      SET status = $1, updated_by = $2, updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `;

    const result = await database.query(query, [status, userId, id, tenantId]);

    if (result.rows.length === 0) {
      throw new Error("Prompt not found");
    }

    return this._formatPrompt(result.rows[0]);
  }

  /**
   * Delete prompt
   */
  async delete(id, tenantId) {
    return await database.transaction(async (client) => {
      // 1. Verify existence and tenant ownership
      const checkResult = await client.query(
        "SELECT id FROM ai_prompt_templates WHERE id = $1 AND tenant_id = $2",
        [id, tenantId],
      );

      if (checkResult.rows.length === 0) {
        throw new Error("Prompt not found");
      }

      // 2. Delete test results associated with this prompt's test cases
      await client.query(
        `
        DELETE FROM ai_prompt_test_results 
        WHERE test_case_id IN (SELECT id FROM ai_prompt_test_cases WHERE prompt_id = $1)
      `,
        [id],
      );

      // 3. Delete test cases associated with this prompt
      await client.query(
        "DELETE FROM ai_prompt_test_cases WHERE prompt_id = $1",
        [id],
      );

      // 4. Delete version history
      await client.query(
        "DELETE FROM ai_prompt_versions WHERE prompt_id = $1",
        [id],
      );

      // 5. Finally delete the prompt template itself
      await client.query("DELETE FROM ai_prompt_templates WHERE id = $1", [id]);

      return { success: true };
    });
  }

  /**
   * Clone prompt
   */
  async clone(id, tenantId, newName, userId) {
    const existing = await this.getById(id, tenantId);

    if (!existing) {
      throw new Error("Prompt not found");
    }

    return this.create(
      {
        name: newName || `${existing.name} (Copy)`,
        description: existing.description,
        useCase: existing.useCase,
        template: existing.template,
        systemMessage: existing.systemMessage,
        variables: existing.variables,
        defaultParameters: existing.defaultParameters,
        recommendedModels: existing.recommendedModels,
        tags: existing.tags,
        isDefault: false,
      },
      { tenantId, userId },
    );
  }

  // ==================== Version Management ====================

  /**
   * Get version history
   */
  async getVersions(promptId, tenantId) {
    // Verify prompt exists and belongs to tenant
    const prompt = await this.getById(promptId, tenantId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }

    const query = `
      SELECT v.*, u.email as created_by_email
      FROM ai_prompt_versions v
      LEFT JOIN users u ON u.id = v.created_by
      WHERE v.prompt_id = $1
      ORDER BY v.version DESC
    `;

    const result = await database.query(query, [promptId]);
    return result.rows;
  }

  /**
   * Get specific version
   */
  async getVersion(promptId, version, tenantId) {
    const prompt = await this.getById(promptId, tenantId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }

    const query = `
      SELECT * FROM ai_prompt_versions
      WHERE prompt_id = $1 AND version = $2
    `;

    const result = await database.query(query, [promptId, version]);
    return result.rows[0] || null;
  }

  /**
   * Rollback to previous version
   */
  async rollback(promptId, version, tenantId, userId) {
    const versionData = await this.getVersion(promptId, version, tenantId);

    if (!versionData) {
      throw new Error("Version not found");
    }

    return this.update(
      promptId,
      tenantId,
      {
        template: versionData.template,
        systemMessage: versionData.system_message,
        variables: versionData.variables,
        defaultParameters: versionData.default_parameters,
        changeNotes: `Rolled back to version ${version}`,
      },
      { userId },
    );
  }

  // ==================== Execution ====================

  /**
   * Execute prompt with variables
   */
  /**
   * Execute prompt with variables
   */
  async execute(promptId, inputVariables, context = {}) {
    const { tenantId, userId, stream, onChunk, provider, model, temperature, max_tokens, clientRequestId } = context;

    const abortController = new AbortController();
    if (clientRequestId) {
      executionRegistry.register(clientRequestId, abortController);
    }

    const prompt = await this.getById(promptId, tenantId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }

    if (prompt.status !== "active") {
      throw new Error("Prompt is not active");
    }

    // Build the final prompt by replacing variables
    let finalPrompt = prompt.template;
    const variables = prompt.variables || [];

    for (const variable of variables) {
      const value = inputVariables[variable.name];
      if (variable.required && (value === undefined || value === null)) {
        throw new Error(`Required variable missing: ${variable.name}`);
      }
      const placeholder = `{{${variable.name}}}`;
      finalPrompt = finalPrompt.replace(
        new RegExp(placeholder, "g"),
        value || variable.default || "",
      );
    }

    // Build messages array
    const messages = [];

    if (prompt.systemMessage) {
      messages.push({ role: "system", content: prompt.systemMessage });
    }

    messages.push({ role: "user", content: finalPrompt });

    // Get AI gateway and execute
    const gateway = await this._getGateway();
    const defaultParams = prompt.defaultParameters || {};

    const params = {
      model: model || defaultParams.model || prompt.recommendedModels?.[0],
      provider: provider || defaultParams.provider,
      temperature: temperature !== undefined ? temperature : defaultParams.temperature,
      max_tokens: max_tokens !== undefined ? max_tokens : defaultParams.max_tokens,
    };

    const completionId = crypto.randomUUID();
    const startTime = Date.now();

    if (stream && onChunk) {
      try {
        let fullContent = "";
        const result = await gateway.createStreamingCompletion(
          {
            messages,
            model: params.model,
            provider: params.provider,
            temperature: params.temperature,
            max_tokens: params.max_tokens,
            signal: abortController.signal,
          },
          (chunk) => {
            if (chunk.content) {
              fullContent += chunk.content;
            }
            const remoteId = chunk.requestId || chunk.request_id || chunk.id;
            if (remoteId && clientRequestId) {
              executionRegistry.associateRemoteId(clientRequestId, remoteId);
            }
            onChunk(chunk);
          },
          {
            ...context,
            clientRequestId
          }
        );

        const duration = Date.now() - startTime;
        const promptTokens = Math.ceil((finalPrompt.length + (prompt.systemMessage?.length || 0)) / 4);
        const completionTokens = Math.ceil(fullContent.length / 4);
        const totalTokens = promptTokens + completionTokens;
        const cost = gateway.estimateCost(params.provider || gateway.defaultProvider, params.model || 'unknown', promptTokens, completionTokens);

        // Log successful prompt execution to ai_completions table
        const insertQuery = `
          INSERT INTO ai_completions (
            id, tenant_id, module_id, user_id, provider, model,
            use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
            response, status, cached, streaming, prompt_tokens, completion_tokens, total_tokens,
            cost_usd, latency_ms, metadata, completed_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(), NOW())
        `;

        await database.query(insertQuery, [
          completionId,
          tenantId,
          null, // module_id
          userId || null,
          params.provider || result.provider || 'unknown',
          params.model || result.model || 'unknown',
          prompt.useCase || 'prompt_execution',
          promptId,
          finalPrompt,
          prompt.systemMessage || null,
          params.temperature !== undefined ? parseFloat(params.temperature) : null,
          params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
          fullContent,
          'completed',
          false, // cached
          true, // streaming
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          duration,
          JSON.stringify({
            input_variables: inputVariables,
            prompt_version: prompt.version,
            request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
            fallback_info: result?.fallbackUsed ? {
              fallback_used: true,
              successful_provider: result.provider,
              successful_model: result.model,
              failed_attempts: (result.failedAttempts || []).map((a) => ({
                provider: a.provider,
                error: a.error,
              })),
            } : undefined
          })
        ]);

        // Update usage count
        await database.query(
          `
          UPDATE ai_prompt_templates
          SET usage_count = usage_count + 1, updated_at = NOW()
          WHERE id = $1
        `,
          [promptId],
        );

        if (clientRequestId) {
          executionRegistry.remove(clientRequestId);
        }

        return {
          promptId,
          promptVersion: prompt.version,
          content: fullContent,
          provider: params.provider || result.provider,
          model: params.model || result.model,
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          },
          cost,
          latency_ms: duration,
          requestId: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
          request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
          ...(result?.fallbackUsed && {
            fallback_info: {
              fallback_used: true,
              successful_provider: result.provider,
              successful_model: result.model,
              failed_attempts: (result.failedAttempts || []).map((a) => ({
                provider: a.provider,
                error: a.error,
              })),
            },
          }),
        };
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failed prompt execution
        const insertQuery = `
          INSERT INTO ai_completions (
            id, tenant_id, module_id, user_id, provider, model,
            use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
            status, error_message, cached, streaming, latency_ms, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        `;

        await database.query(insertQuery, [
          completionId,
          tenantId,
          null,
          userId || null,
          params.provider || 'unknown',
          params.model || 'unknown',
          prompt.useCase || 'prompt_execution',
          promptId,
          finalPrompt,
          prompt.systemMessage || null,
          params.temperature !== undefined ? parseFloat(params.temperature) : null,
          params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
          'failed',
          error.message,
          false,
          true,
          duration,
          JSON.stringify({
            input_variables: inputVariables,
            prompt_version: prompt.version,
            error_code: error.code || 'UNKNOWN',
            fallback_info: {
              fallback_used: true,
              failed_attempts: (error.failedAttempts || []).map((a) => ({
                provider: a.provider,
                error: a.error,
              }))
            }
          })
        ]).catch(err => console.error("[PromptService] failed logging streaming error:", err.message));

        if (clientRequestId) {
          executionRegistry.remove(clientRequestId);
        }
        throw error;
      }
    }

    try {
      const result = await gateway.createCompletion(
        {
          messages,
          model: params.model,
          provider: params.provider,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          signal: abortController.signal,
        },
        {
          ...context,
          clientRequestId
        },
      );

      const duration = Date.now() - startTime;

      // Log successful prompt execution to ai_completions table
      const insertQuery = `
        INSERT INTO ai_completions (
          id, tenant_id, module_id, user_id, provider, model,
          use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
          response, status, cached, streaming, prompt_tokens, completion_tokens, total_tokens,
          cost_usd, latency_ms, metadata, completed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(), NOW())
      `;

      await database.query(insertQuery, [
        completionId,
        tenantId,
        null, // module_id
        userId || null,
        result.provider,
        result.model,
        prompt.useCase || 'prompt_execution',
        promptId,
        finalPrompt,
        prompt.systemMessage || null,
        params.temperature !== undefined ? parseFloat(params.temperature) : null,
        params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
        result.content,
        'completed',
        false, // cached
        false, // streaming
        result.usage?.prompt_tokens || 0,
        result.usage?.completion_tokens || 0,
        result.usage?.total_tokens || 0,
        result.cost || 0,
        result.latency_ms || duration,
        JSON.stringify({
          input_variables: inputVariables,
          prompt_version: prompt.version,
          request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
          fallback_info: result.fallbackUsed ? {
            fallback_used: true,
            successful_provider: result.provider,
            successful_model: result.model,
            failed_attempts: (result.failedAttempts || []).map((a) => ({
              provider: a.provider,
              error: a.error,
            })),
          } : undefined
        })
      ]);

      if (clientRequestId) {
        const remoteId = result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id));
        if (remoteId) {
          executionRegistry.associateRemoteId(clientRequestId, remoteId);
        }
        executionRegistry.remove(clientRequestId);
      }

      // Update usage count
      await database.query(
        `
        UPDATE ai_prompt_templates
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = $1
      `,
        [promptId],
      );

      return {
        promptId,
        promptVersion: prompt.version,
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        cost: result.cost,
        latency_ms: result.latency_ms,
        requestId: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
        request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
        ...(result.fallbackUsed && {
          fallback_info: {
            fallback_used: true,
            successful_provider: result.provider,
            successful_model: result.model,
            failed_attempts: (result.failedAttempts || []).map((a) => ({
              provider: a.provider,
              error: a.error,
            })),
          },
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed prompt execution
      const insertQuery = `
        INSERT INTO ai_completions (
          id, tenant_id, module_id, user_id, provider, model,
          use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
          status, error_message, cached, streaming, latency_ms, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      `;

      await database.query(insertQuery, [
        completionId,
        tenantId,
        null,
        userId || null,
        params.provider || 'unknown',
        params.model || prompt.recommendedModels?.[0] || 'unknown',
        prompt.useCase || 'prompt_execution',
        promptId,
        finalPrompt,
        prompt.systemMessage || null,
        params.temperature !== undefined ? parseFloat(params.temperature) : null,
        params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
        'failed',
        error.message,
        false,
        false,
        duration,
        JSON.stringify({
          input_variables: inputVariables,
          prompt_version: prompt.version,
          error_code: error.code || 'UNKNOWN',
          fallback_info: {
            fallback_used: true,
            failed_attempts: (error.failedAttempts || []).map((a) => ({
              provider: a.provider,
              error: a.error,
            }))
          }
        })
      ]).catch(err => console.error("[PromptService] failed logging error:", err.message));

      if (clientRequestId) {
        executionRegistry.remove(clientRequestId);
      }
      throw error;
    }
  }

  /**
   * Execute prompt with file upload (multimodal).
   * File is classified as visual (sent natively to LLM) or text (extracted and injected as variable).
   *
   * @param {string} promptId - Prompt template ID
   * @param {Buffer} fileBuffer - Uploaded file content
   * @param {string} fileName - Original file name
   * @param {string} mimeType - File MIME type
   * @param {Object} inputVariables - Template variables (optional)
   * @param {Object} context - { tenantId, userId }
   */
  async executeWithFile(
    promptId,
    fileBuffer,
    fileName,
    mimeType,
    inputVariables = {},
    context = {},
  ) {
    const { tenantId, userId, stream, onChunk, provider, model, temperature, max_tokens, clientRequestId } = context;

    const abortController = new AbortController();
    if (clientRequestId) {
      executionRegistry.register(clientRequestId, abortController);
    }

    const prompt = await this.getById(promptId, tenantId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }

    if (prompt.status !== "active") {
      throw new Error(
        "Prompt is not active. Set status to active before executing.",
      );
    }

    // Classify the file: visual (image/PDF) or text-extractable (DOCX/Excel/TXT)
    const {
      getDocumentProcessor,
    } = require("../infrastructure/ai/document.processor");
    const processor = getDocumentProcessor();
    const classification = processor.classifyForMultimodal(
      fileBuffer,
      mimeType,
    );

    // Build the final prompt by replacing variables
    let finalPrompt = prompt.template;
    const variables = prompt.variables || [];

    // If text-extractable, extract text and inject as {{file_content}} variable
    if (classification.mode === "text") {
      const { text } = await processor.processBuffer(
        fileBuffer,
        mimeType,
        fileName,
      );
      inputVariables.file_content = text;
    }

    for (const variable of variables) {
      const value = inputVariables[variable.name];
      if (variable.required && (value === undefined || value === null)) {
        throw new Error(`Required variable missing: ${variable.name}`);
      }
      const placeholder = `{{${variable.name}}}`;
      finalPrompt = finalPrompt.replace(
        new RegExp(placeholder, "g"),
        value || variable.default || "",
      );
    }

    // Also replace {{file_content}} even if not in variables definition
    if (inputVariables.file_content) {
      finalPrompt = finalPrompt.replace(
        /\{\{file_content\}\}/g,
        inputVariables.file_content,
      );
    }

    // Build messages
    const messages = [];
    if (prompt.systemMessage) {
      messages.push({ role: "system", content: prompt.systemMessage });
    }
    messages.push({ role: "user", content: finalPrompt });

    // Get AI gateway
    const gateway = await this._getGateway();
    const defaultParams = prompt.defaultParameters || {};

    const params = {
      model: model || defaultParams.model || prompt.recommendedModels?.[0],
      provider: provider || defaultParams.provider,
      temperature: temperature !== undefined ? temperature : defaultParams.temperature,
      max_tokens: max_tokens !== undefined ? max_tokens : defaultParams.max_tokens,
    };

    const completionId = crypto.randomUUID();
    const startTime = Date.now();
    let result;

    if (stream && onChunk) {
      try {
        let fullContent = "";
        result = await gateway.createStreamingCompletion(
          {
            messages,
            model: params.model,
            provider: params.provider,
            temperature: params.temperature,
            max_tokens: params.max_tokens,
            signal: abortController.signal,
          },
          (chunk) => {
            if (chunk.content) {
              fullContent += chunk.content;
            }
            const remoteId = chunk.requestId || chunk.request_id || chunk.id;
            if (remoteId && clientRequestId) {
              executionRegistry.associateRemoteId(clientRequestId, remoteId);
            }
            onChunk(chunk);
          },
          {
            ...context,
            clientRequestId
          }
        );

        const duration = Date.now() - startTime;
        const promptTokens = Math.ceil((finalPrompt.length + (prompt.systemMessage?.length || 0)) / 4);
        const completionTokens = Math.ceil(fullContent.length / 4);
        const totalTokens = promptTokens + completionTokens;
        const cost = gateway.estimateCost(params.provider || result.provider || gateway.defaultProvider, params.model || result.model || 'unknown', promptTokens, completionTokens);

        // Log successful streaming multimodal completion to ai_completions table
        const insertQuery = `
          INSERT INTO ai_completions (
            id, tenant_id, module_id, user_id, provider, model,
            use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
            response, status, cached, streaming, prompt_tokens, completion_tokens, total_tokens,
            cost_usd, latency_ms, metadata, completed_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(), NOW())
        `;

        await database.query(insertQuery, [
          completionId,
          tenantId,
          null,
          userId || null,
          params.provider || result.provider || 'unknown',
          params.model || result.model || 'unknown',
          prompt.useCase || 'prompt_execution',
          promptId,
          finalPrompt,
          prompt.systemMessage || null,
          params.temperature !== undefined ? parseFloat(params.temperature) : null,
          params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
          fullContent,
          'completed',
          false,
          true,
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          duration,
          JSON.stringify({
            input_variables: inputVariables,
            prompt_version: prompt.version,
            request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
            file_processing: {
              fileName,
              mimeType,
              mode: classification.mode,
              fileSize: fileBuffer.length,
            },
            fallback_info: result?.fallbackUsed ? {
              fallback_used: true,
              successful_provider: result.provider,
              successful_model: result.model,
              failed_attempts: (result.failedAttempts || []).map((a) => ({
                provider: a.provider,
                error: a.error,
              })),
            } : undefined
          })
        ]);

        // Update usage count
        await database.query(
          `
          UPDATE ai_prompt_templates
          SET usage_count = usage_count + 1, updated_at = NOW()
          WHERE id = $1
        `,
          [promptId],
        );

        if (clientRequestId) {
          executionRegistry.remove(clientRequestId);
        }

        return {
          promptId,
          promptVersion: prompt.version,
          content: fullContent,
          provider: params.provider || result.provider,
          model: params.model || result.model,
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          },
          cost,
          latency_ms: duration,
          requestId: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
          request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
          fileProcessing: {
            fileName,
            mimeType,
            mode: classification.mode,
            fileSize: fileBuffer.length,
          },
          ...(result?.fallbackUsed && {
            fallback_info: {
              fallback_used: true,
              successful_provider: result.provider,
              successful_model: result.model,
              failed_attempts: (result.failedAttempts || []).map((a) => ({
                provider: a.provider,
                error: a.error,
              })),
            },
          }),
        };
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failed multimodal execution
        const insertQuery = `
          INSERT INTO ai_completions (
            id, tenant_id, module_id, user_id, provider, model,
            use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
            status, error_message, cached, streaming, latency_ms, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        `;

        await database.query(insertQuery, [
          completionId,
          tenantId,
          null,
          userId || null,
          params.provider || 'unknown',
          params.model || prompt.recommendedModels?.[0] || 'unknown',
          prompt.useCase || 'prompt_execution',
          promptId,
          finalPrompt,
          prompt.systemMessage || null,
          params.temperature !== undefined ? parseFloat(params.temperature) : null,
          params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
          'failed',
          error.message,
          false,
          true,
          duration,
          JSON.stringify({
            input_variables: inputVariables,
            prompt_version: prompt.version,
            error_code: error.code || 'UNKNOWN',
            file_processing: {
              fileName,
              mimeType,
              mode: classification.mode,
              fileSize: fileBuffer.length,
            },
            fallback_info: {
              fallback_used: true,
              failed_attempts: (error.failedAttempts || []).map((a) => ({
                provider: a.provider,
                error: a.error,
              }))
            }
          })
        ]).catch(err => console.error("[PromptService] failed logging error:", err.message));

        if (clientRequestId) {
          executionRegistry.remove(clientRequestId);
        }
        throw error;
      }
    }

    try {
      if (classification.mode === "visual") {
        // Send file natively to LLM's vision capability
        result = await gateway.createMultimodalCompletion(
          {
            messages,
            files: [
              { mimeType: classification.mimeType, data: classification.data },
            ],
            model: params.model || prompt.recommendedModels?.[0],
            provider: params.provider,
            temperature: params.temperature,
            max_tokens: params.max_tokens || 4096,
            signal: abortController.signal,
          },
          {
            ...context,
            clientRequestId
          },
        );
      } else {
        // Text already injected into prompt — use standard completion
        result = await gateway.createCompletion(
          {
            messages,
            model: params.model || prompt.recommendedModels?.[0],
            provider: params.provider,
            temperature: params.temperature,
            max_tokens: params.max_tokens,
            signal: abortController.signal,
          },
          {
            ...context,
            clientRequestId
          },
        );
      }

      const duration = Date.now() - startTime;

      // Log successful multimodal completion to ai_completions table
      const insertQuery = `
        INSERT INTO ai_completions (
          id, tenant_id, module_id, user_id, provider, model,
          use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
          response, status, cached, streaming, prompt_tokens, completion_tokens, total_tokens,
          cost_usd, latency_ms, metadata, completed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW(), NOW())
      `;

      await database.query(insertQuery, [
        completionId,
        tenantId,
        null,
        userId || null,
        result.provider,
        result.model,
        prompt.useCase || 'prompt_execution',
        promptId,
        finalPrompt,
        prompt.systemMessage || null,
        params.temperature !== undefined ? parseFloat(params.temperature) : null,
        params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
        result.content,
        'completed',
        false,
        false,
        result.usage?.prompt_tokens || 0,
        result.usage?.completion_tokens || 0,
        result.usage?.total_tokens || 0,
        result.cost || 0,
        result.latency_ms || duration,
        JSON.stringify({
          input_variables: inputVariables,
          prompt_version: prompt.version,
          request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
          file_processing: {
            fileName,
            mimeType,
            mode: classification.mode,
            fileSize: fileBuffer.length,
          },
          fallback_info: result.fallbackUsed ? {
            fallback_used: true,
            successful_provider: result.provider,
            successful_model: result.model,
            failed_attempts: (result.failedAttempts || []).map((a) => ({
              provider: a.provider,
              error: a.error,
            })),
          } : undefined
        })
      ]);

      if (clientRequestId) {
        const remoteId = result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id));
        if (remoteId) {
          executionRegistry.associateRemoteId(clientRequestId, remoteId);
        }
        executionRegistry.remove(clientRequestId);
      }

      // Update usage count
      await database.query(
        `
        UPDATE ai_prompt_templates
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = $1
      `,
        [promptId],
      );

      return {
        promptId,
        promptVersion: prompt.version,
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        cost: result.cost,
        latency_ms: result.latency_ms,
        requestId: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
        request_id: result.requestId || result.id || (result.raw && (result.raw.request_id || result.raw.id)),
        fileProcessing: {
          fileName,
          mimeType,
          mode: classification.mode,
          fileSize: fileBuffer.length,
        },
        ...(result.fallbackUsed && {
          fallback_info: {
            fallback_used: true,
            successful_provider: result.provider,
            successful_model: result.model,
            failed_attempts: (result.failedAttempts || []).map((a) => ({
              provider: a.provider,
              error: a.error,
            })),
          },
        }),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed multimodal execution
      const insertQuery = `
        INSERT INTO ai_completions (
          id, tenant_id, module_id, user_id, provider, model,
          use_case, prompt_template_id, prompt, system_message, temperature, max_tokens,
          status, error_message, cached, streaming, latency_ms, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      `;

      await database.query(insertQuery, [
        completionId,
        tenantId,
        null,
        userId || null,
        params.provider || 'unknown',
        params.model || prompt.recommendedModels?.[0] || 'unknown',
        prompt.useCase || 'prompt_execution',
        promptId,
        finalPrompt,
        prompt.systemMessage || null,
        params.temperature !== undefined ? parseFloat(params.temperature) : null,
        params.max_tokens !== undefined ? parseInt(params.max_tokens) : null,
        'failed',
        error.message,
        false,
        false,
        duration,
        JSON.stringify({
          input_variables: inputVariables,
          prompt_version: prompt.version,
          error_code: error.code || 'UNKNOWN',
          file_processing: {
            fileName,
            mimeType,
            mode: classification.mode,
            fileSize: fileBuffer.length,
          },
          fallback_info: {
            fallback_used: true,
            failed_attempts: (error.failedAttempts || []).map((a) => ({
              provider: a.provider,
              error: a.error,
            }))
          }
        })
      ]).catch(err => console.error("[PromptService] failed logging error:", err.message));

      if (clientRequestId) {
        executionRegistry.remove(clientRequestId);
      }
      throw error;
    }
  }

  /**
   * Get prompt execution history and aggregate statistics
   */
  async getExecutions(promptId, tenantId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    // Verify prompt exists and belongs to tenant
    const prompt = await this.getById(promptId, tenantId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }

    const params = [promptId, tenantId];
    let paramIndex = 2;
    let statusFilter = '';

    if (status) {
      paramIndex++;
      statusFilter = ` AND status = $${paramIndex}`;
      params.push(status);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*)::int AS count 
      FROM ai_completions 
      WHERE prompt_template_id = $1 AND tenant_id = $2${statusFilter}
    `;
    const countResult = await database.query(countQuery, params);
    const total = countResult.rows[0].count;

    // Get paginated executions
    const queryParams = [...params];
    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT * 
      FROM ai_completions 
      WHERE prompt_template_id = $1 AND tenant_id = $2${statusFilter}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    const dataResult = await database.query(dataQuery, queryParams);

    // Get aggregate statistics
    const statsQuery = `
      SELECT 
        COUNT(*)::int as total_runs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as success_runs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::int as failed_runs,
        COALESCE(AVG(cost_usd), 0)::float as avg_cost,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN latency_ms END), 0)::float as avg_latency
      FROM ai_completions
      WHERE prompt_template_id = $1 AND tenant_id = $2
    `;
    const statsResult = await database.query(statsQuery, [promptId, tenantId]);
    const stats = statsResult.rows[0];

    const totalRuns = stats.total_runs || 0;
    const successRate = totalRuns > 0 ? (stats.success_runs / totalRuns) * 100 : 0;

    const summary = {
      usage_count: totalRuns,
      success_rate: parseFloat(successRate.toFixed(2)),
      avg_cost: parseFloat(stats.avg_cost.toFixed(6)),
      avg_latency: Math.round(stats.avg_latency),
      failed_runs: stats.failed_runs || 0,
      success_runs: stats.success_runs || 0
    };

    return {
      summary,
      data: dataResult.rows.map(row => {
        let metadata = row.metadata;
        if (metadata != null && typeof metadata === 'string') {
          try { metadata = JSON.parse(metadata); } catch {}
        }
        return {
          id: row.id,
          tenant_id: row.tenant_id,
          prompt_template_id: row.prompt_template_id,
          use_case: row.use_case,
          provider: row.provider,
          model: row.model,
          prompt: row.prompt,
          system_message: row.system_message,
          temperature: row.temperature ? parseFloat(row.temperature) : null,
          max_tokens: row.max_tokens,
          response: row.response,
          status: row.status,
          prompt_tokens: row.prompt_tokens,
          completion_tokens: row.completion_tokens,
          total_tokens: row.total_tokens,
          cost: row.cost_usd ? parseFloat(row.cost_usd) : 0,
          latency_ms: row.latency_ms,
          error_message: row.error_message,
          metadata,
          created_at: row.created_at,
          completed_at: row.completed_at
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Test prompt (playground)
   */
  async test(promptId, inputVariables, options = {}, context = {}) {
    const { tenantId } = context;

    const prompt = await this.getById(promptId, tenantId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }

    // Build the final prompt
    let finalPrompt = prompt.template;
    const variables = prompt.variables || [];

    for (const variable of variables) {
      const value = inputVariables[variable.name];
      const placeholder = `{{${variable.name}}}`;
      finalPrompt = finalPrompt.replace(
        new RegExp(placeholder, "g"),
        value || variable.default || "",
      );
    }

    // Build messages
    const messages = [];
    if (prompt.systemMessage) {
      messages.push({ role: "system", content: prompt.systemMessage });
    }
    messages.push({ role: "user", content: finalPrompt });

    // Execute with options override
    const gateway = await this._getGateway();

    const result = await gateway.createCompletion(
      {
        messages,
        model: options.model || prompt.defaultParameters?.model,
        provider: options.provider,
        temperature:
          options.temperature ?? prompt.defaultParameters?.temperature,
        max_tokens: options.max_tokens || prompt.defaultParameters?.max_tokens,
      },
      context,
    );

    return {
      promptId,
      promptVersion: prompt.version,
      renderedPrompt: finalPrompt,
      systemMessage: prompt.systemMessage,
      content: result.content,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      cost: result.cost,
      latency_ms: result.latency_ms,
    };
  }

  // ==================== Test Cases ====================

  /**
   * Create test case
   */
  async createTestCase(promptId, data, context = {}) {
    const { tenantId, userId } = context;
    const {
      name,
      description,
      inputVariables,
      expectedOutput,
      tags = [],
    } = data;

    const prompt = await this.getById(promptId, tenantId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }

    const id = crypto.randomUUID();

    const query = `
      INSERT INTO ai_prompt_test_cases (
        id, prompt_id, tenant_id, name, description,
        input_variables, expected_output, tags, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      id,
      promptId,
      tenantId,
      name,
      description,
      JSON.stringify(inputVariables),
      expectedOutput,
      JSON.stringify(tags),
      userId,
    ]);

    return result.rows[0];
  }

  /**
   * List test cases
   */
  async listTestCases(promptId, tenantId) {
    const query = `
      SELECT * FROM ai_prompt_test_cases
      WHERE prompt_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
    `;
    const result = await database.query(query, [promptId, tenantId]);
    return result.rows;
  }

  /**
   * Run test case
   */
  async runTestCase(testCaseId, context = {}) {
    const { tenantId, userId } = context;

    const testCase = await database.query(
      "SELECT * FROM ai_prompt_test_cases WHERE id = $1 AND tenant_id = $2",
      [testCaseId, tenantId],
    );

    if (testCase.rows.length === 0) {
      throw new Error("Test case not found");
    }

    const tc = testCase.rows[0];

    // Run the prompt
    const result = await this.test(
      tc.prompt_id,
      tc.input_variables,
      {},
      context,
    );

    // Store result
    const resultId = crypto.randomUUID();
    await database.query(
      `
      INSERT INTO ai_prompt_test_results (
        id, test_case_id, prompt_version, provider, model,
        input_variables, output, tokens_used, cost_usd, latency_ms,
        run_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `,
      [
        resultId,
        testCaseId,
        result.promptVersion,
        result.provider,
        result.model,
        JSON.stringify(tc.input_variables),
        result.content,
        result.usage.total_tokens,
        result.cost,
        result.latency_ms,
        userId,
      ],
    );

    return {
      testCaseId,
      resultId,
      ...result,
      expectedOutput: tc.expected_output,
    };
  }

  /**
   * Get test results
   */
  async getTestResults(testCaseId, tenantId, options = {}) {
    const { limit = 10 } = options;

    const query = `
      SELECT r.*, u.email as run_by_email
      FROM ai_prompt_test_results r
      LEFT JOIN users u ON u.id = r.run_by
      JOIN ai_prompt_test_cases tc ON tc.id = r.test_case_id
      WHERE r.test_case_id = $1 AND tc.tenant_id = $2
      ORDER BY r.created_at DESC
      LIMIT $3
    `;

    const result = await database.query(query, [testCaseId, tenantId, limit]);
    return result.rows;
  }

  // ==================== Helpers ====================

  async _createVersionRecord(
    promptId,
    version,
    template,
    systemMessage,
    variables,
    defaultParameters,
    changeNotes,
    userId,
  ) {
    await database.query(
      `
      INSERT INTO ai_prompt_versions (
        id, prompt_id, version, template, system_message,
        variables, default_parameters, change_notes, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `,
      [
        crypto.randomUUID(),
        promptId,
        version,
        template,
        systemMessage,
        JSON.stringify(variables),
        JSON.stringify(defaultParameters),
        changeNotes,
        userId,
      ],
    );
  }

  _formatPrompt(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      useCase: row.use_case,
      version: row.version,
      template: row.template,
      systemMessage: row.system_message,
      variables: row.variables || [],
      defaultParameters: row.default_parameters || {},
      recommendedModels: row.recommended_models || [],
      status: row.status,
      isDefault: row.is_default,
      usageCount: parseInt(row.usage_count) || 0,
      avgCost: parseFloat(row.avg_cost_usd) || 0,
      avgLatency: row.avg_latency_ms,
      successRate: parseFloat(row.success_rate) || 0,
      tags: row.tags || [],
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      moduleIds: row.module_ids || [],
    };
  }
}

// Singleton
let instance = null;
const getPromptService = () => {
  if (!instance) {
    instance = new PromptService();
  }
  return instance;
};

module.exports = { PromptService, getPromptService };
