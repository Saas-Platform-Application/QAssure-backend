'use strict';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateUUID = (paramName) => (req, res, next) => {
  const value = req.params[paramName];
  if (!value || !UUID_REGEX.test(value)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID_FORMAT', message: `Invalid ${paramName} format. Expected a valid UUID.` }
    });
  }
  next();
};

module.exports = { validateUUID };
