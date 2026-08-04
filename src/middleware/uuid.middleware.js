/**
 * UUID Validation Middleware - QAssure Platform
 * Validates UUID parameters to return 400 instead of 500 on invalid UUIDs
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a specific parameter is a valid UUID
 * @param {string} paramName - The name of the URL parameter to validate
 */
const validateUUID = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    
    if (value && !UUID_REGEX.test(value)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UUID',
          message: `Invalid UUID format for parameter: ${paramName}`,
          details: {
            parameter: paramName,
            value: value
          }
        }
      });
    }
    
    next();
  };
};

/**
 * Validates multiple UUID parameters
 * @param {...string} paramNames - The names of URL parameters to validate
 */
const validateUUIDs = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      
      if (value && !UUID_REGEX.test(value)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_UUID',
            message: `Invalid UUID format for parameter: ${paramName}`,
            details: {
              parameter: paramName,
              value: value
            }
          }
        });
      }
    }
    
    next();
  };
};

/**
 * Validates UUID in request body
 * @param {string} fieldName - The name of the body field to validate
 */
const validateBodyUUID = (fieldName) => {
  return (req, res, next) => {
    const value = req.body[fieldName];
    
    if (value && !UUID_REGEX.test(value)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UUID',
          message: `Invalid UUID format for field: ${fieldName}`,
          details: {
            field: fieldName,
            value: value
          }
        }
      });
    }
    
    next();
  };
};

/**
 * Auto-validates all common UUID parameter names (id, userId, tenantId, etc.)
 */
const autoValidateUUIDs = (req, res, next) => {
  const uuidParams = ['id', 'userId', 'user_id', 'tenantId', 'tenant_id', 'roleId', 'role_id', 
                      'sessionId', 'session_id', 'documentId', 'document_id', 'capaId', 'capa_id',
                      'supplierId', 'supplier_id', 'moduleId', 'module_id', 'keyId', 'key_id',
                      'signatureId', 'signature_id', 'workflowId', 'workflow_id', 'taskId', 'task_id',
                      'collectionId', 'collection_id', 'promptId', 'prompt_id', 'reportId', 'report_id',
                      'webhookId', 'webhook_id', 'templateId', 'template_id', 'courseId', 'course_id',
                      'recordId', 'record_id', 'assignmentId', 'assignment_id'];
  
  for (const paramName of uuidParams) {
    const value = req.params[paramName];
    
    if (value && !UUID_REGEX.test(value)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UUID',
          message: `Invalid UUID format for parameter: ${paramName}`,
          details: {
            parameter: paramName,
            value: value
          }
        }
      });
    }
  }
  
  next();
};

/**
 * Utility function to check if a string is a valid UUID
 */
const isValidUUID = (str) => {
  return UUID_REGEX.test(str);
};

module.exports = {
  validateUUID,
  validateUUIDs,
  validateBodyUUID,
  autoValidateUUIDs,
  isValidUUID,
  UUID_REGEX
};
