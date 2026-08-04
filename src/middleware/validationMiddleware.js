/**
 * Validation Middleware for Zod Schemas
 * Generic validation middleware factory that works with any Zod schema
 */

/**
 * Create a validation middleware function for a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Source of data to validate ('body', 'params', 'query', default: 'body')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // Get data from the specified source
      const data = source === 'params' 
        ? req.params 
        : source === 'query' 
        ? req.query 
        : req.body;

      // Validate data against schema
      const result = schema.safeParse(data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      // Attach validated data to request object
      if (source === 'params') {
        req.params = result.data;
      } else if (source === 'query') {
        req.query = result.data;
      } else {
        req.body = result.data;
      }

      next();
    } catch (error) {
      console.error('[ValidationMiddleware] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Validation middleware error',
        message: error.message
      });
    }
  };
};

module.exports = {
  validate
};

