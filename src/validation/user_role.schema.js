const { z } = require('zod');

// Create schema for Userrole
const CreateUserroleSchema = z.object({
    
  user_id: z.string().uuid(),
  
  role_id: z.string().uuid(),
  
  tenant_id: z.string().uuid().optional().nullable(),
  
  module_id: z.string().uuid().optional().nullable(),
  
  assigned_by: z.string().uuid().optional().nullable(),
  
  assigned_at: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, "assigned_at must be in YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss format"),
    z.string().regex(/^\d{2}-\d{2}-\d{4}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, "assigned_at must be in DD-MM-YYYY or DD-MM-YYYYTHH:mm:ss format"),
    z.coerce.date()
  ]).transform((val) => {
    if (typeof val === 'string') {
      // Handle DD-MM-YYYY or DD-MM-YYYYT... format
      const ddMmYyyyMatch = val.match(/^(\d{2})-(\d{2})-(\d{4})(T.*)?$/);
      if (ddMmYyyyMatch) {
        const [, day, month, year, timePart] = ddMmYyyyMatch;
        const isoDate = timePart ? `${year}-${month}-${day}${timePart}` : `${year}-${month}-${day}`;
        return new Date(isoDate);
      }
      // Handle ISO format or other valid date strings
      return new Date(val);
    }
    return val instanceof Date ? val : new Date(val);
  }),
  
  expires_at: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, "expires_at must be in YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss format"),
    z.string().regex(/^\d{2}-\d{2}-\d{4}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, "expires_at must be in DD-MM-YYYY or DD-MM-YYYYTHH:mm:ss format"),
    z.coerce.date()
  ]).optional().nullable().transform((val) => {
    if (!val) return val;
    if (typeof val === 'string') {
      // Handle DD-MM-YYYY or DD-MM-YYYYT... format
      const ddMmYyyyMatch = val.match(/^(\d{2})-(\d{2})-(\d{4})(T.*)?$/);
      if (ddMmYyyyMatch) {
        const [, day, month, year, timePart] = ddMmYyyyMatch;
        const isoDate = timePart ? `${year}-${month}-${day}${timePart}` : `${year}-${month}-${day}`;
        return new Date(isoDate);
      }
      // Handle ISO format or other valid date strings
      return new Date(val);
    }
    return val instanceof Date ? val : new Date(val);
  }),

});

const UpdateUserroleSchema = CreateUserroleSchema.partial();

const UserroleParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateUserroleSchema,
  UpdateUserroleSchema,
  UserroleParamsSchema,
  };
