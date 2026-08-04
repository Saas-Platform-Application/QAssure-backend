const { z } = require('zod');

// Contact schema for tenant creation
const ContactSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email must be at most 255 characters"),
  // password: z.string().min(6, "Password must be at least 6 characters"),
  first_name: z.string().min(1, "First name is required").max(255, "First name must be at most 255 characters"),
  last_name: z.string().min(1, "Last name is required").max(255, "Last name must be at most 255 characters"),
  contact_phone: z.string().max(255, "Contact phone must be at most 255 characters").optional().nullable(),
  address_line1: z.string().max(255, "Address line 1 must be at most 255 characters").optional().nullable(),
  address_line2: z.string().max(255, "Address line 2 must be at most 255 characters").optional().nullable(),
  city: z.string().max(255, "City must be at most 255 characters").optional().nullable(),
  state: z.string().max(255, "State must be at most 255 characters").optional().nullable(),
  postal_code: z.string().max(255, "Postal code must be at most 255 characters").optional().nullable(),
  country: z.string().max(255, "Country must be at most 255 characters").optional().nullable(),
});

// Contact schema for tenant update (password is optional)
const UpdateContactSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  email: z.string().email("Invalid email format").max(255, "Email must be at most 255 characters").optional(),
  // password: z.string().min(6, "Password must be at least 6 characters").optional(),
  first_name: z.string().min(1, "First name is required").max(255, "First name must be at most 255 characters").optional(),
  last_name: z.string().min(1, "Last name is required").max(255, "Last name must be at most 255 characters").optional(),
  contact_phone: z.string().max(255, "Contact phone must be at most 255 characters").optional().nullable(),
  address_line1: z.string().max(255, "Address line 1 must be at most 255 characters").optional().nullable(),
  address_line2: z.string().max(255, "Address line 2 must be at most 255 characters").optional().nullable(),
  city: z.string().max(255, "City must be at most 255 characters").optional().nullable(),
  state: z.string().max(255, "State must be at most 255 characters").optional().nullable(),
  postal_code: z.string().max(255, "Postal code must be at most 255 characters").optional().nullable(),
  country: z.string().max(255, "Country must be at most 255 characters").optional().nullable(),
});

// Branding schema for creation
const BrandingSchema = z.object({
  logo_file_path: z.string().optional().nullable(),
  logo_file_attachment_uuid: z.string().uuid().optional().nullable(),
  favicon_file_path: z.string().optional().nullable(),
  favicon_file_attachment_uuid: z.string().uuid().optional().nullable(),
  primary_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  accent_color: z.string().optional().nullable(),
});

// Branding schema for update (fields are optional)
const UpdateBrandingSchema = z.object({
  logo_file_path: z.string().optional().nullable(),
  logo_file_attachment_uuid: z.string().uuid().optional().nullable(),
  favicon_file_path: z.string().optional().nullable(),
  favicon_file_attachment_uuid: z.string().uuid().optional().nullable(),
  primary_color: z.string().optional().nullable(),
  secondary_color: z.string().optional().nullable(),
  accent_color: z.string().optional().nullable(),
});

// Settings schema for creation
const SettingsSchema = z.object({
  enable_sso: z.boolean().optional().default(false),
  enable_2fa: z.boolean().optional().default(false),
  contact: ContactSchema.optional().nullable(),
  branding: BrandingSchema.optional().nullable(),
});

// Settings schema for update (uses UpdateContactSchema and UpdateBrandingSchema)
const UpdateSettingsSchema = z.object({
  enable_sso: z.boolean().optional().default(false),
  enable_2fa: z.boolean().optional().default(false),
  contact: UpdateContactSchema.optional().nullable(),
  branding: UpdateBrandingSchema.optional().nullable(),
});

// Create schema for Tenant
const CreateTenantSchema = z.object({

  name: z.string().trim().min(1, "name is required").min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters"),

  slug: z.string().trim().min(1, "slug is required").min(3, "slug must be at least 3 characters").max(100, "slug must be at most 100 characters").regex(/^[a-z0-9-]+$/, "slug format is invalid"),

  domain: z.string().optional().nullable(),

  status: z.enum(["active", "suspended", "deleted"]),

  settings: SettingsSchema.optional().nullable(),

  subscription_tier: z.string().max(50, "subscription_tier must be at most 50 characters").optional().nullable(),

  max_users: z.number().int().min(1, "max_users must be at least 1").optional().nullable(),

  max_modules: z.number().int().min(1, "max_modules must be at least 1").optional().nullable(),

  module_ids: z.array(z.string().uuid(), "module_ids must be an array of valid UUIDs").optional().nullable(),

  // Platform service keys to enable for this tenant
  // Array of service key strings (e.g. ['document', 'capa', 'ai'])
  // Services NOT in this array will be set to disabled.
  // If omitted on create, all services are enabled by default.
  service_keys: z.array(z.string().min(1).max(100)).optional().nullable(),

  // Direct fields for enable_sso and enable_2fa (can be in settings or at root level)
  enable_sso: z.boolean().optional().default(false),
  enable_2fa: z.boolean().optional().default(false),

});

// Update schema - uses UpdateSettingsSchema instead of SettingsSchema
const UpdateTenantSchema = CreateTenantSchema.partial().extend({
  settings: UpdateSettingsSchema.optional().nullable(),
});

const TenantParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantParamsSchema,
};
