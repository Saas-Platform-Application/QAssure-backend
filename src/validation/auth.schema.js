const { z } = require('zod');

// Registration Schema
const RegisterSchema = z.object({
  email: z.string().min(1, "email is required").min(5, "email must be at least 5 characters").max(255, "email must be at most 255 characters").email("Invalid email format"),
  
  password: z.string().min(1, "password is required").min(8, "password must be at least 8 characters").max(128, "password must be at most 128 characters"),
  
  first_name: z.string().min(1, "first_name is required").min(2, "first_name must be at least 2 characters").max(100, "first_name must be at most 100 characters").regex(/^[a-zA-Z\s'-]+$/, "first_name contains invalid characters").optional(),
  
  firstName: z.string().min(1, "firstName is required").min(2, "firstName must be at least 2 characters").max(100, "firstName must be at most 100 characters").regex(/^[a-zA-Z\s'-]+$/, "firstName contains invalid characters").optional(),
  
  last_name: z.string().min(1, "last_name is required").min(2, "last_name must be at least 2 characters").max(100, "last_name must be at most 100 characters").regex(/^[a-zA-Z\s'-]+$/, "last_name contains invalid characters").optional(),
  
  lastName: z.string().min(1, "lastName is required").min(2, "lastName must be at least 2 characters").max(100, "lastName must be at most 100 characters").regex(/^[a-zA-Z\s'-]+$/, "lastName contains invalid characters").optional(),
  
  tenant_id: z.string().uuid("tenant_id format is invalid").optional().nullable(),
}).refine(
  (data) => data.first_name || data.firstName,
  {
    message: "first_name or firstName is required",
    path: ["first_name"]
  }
).refine(
  (data) => data.last_name || data.lastName,
  {
    message: "last_name or lastName is required",
    path: ["last_name"]
  }
);

// Login Schema
const LoginSchema = z.object({
  email: z.string().min(1, "email is required").min(5, "email must be at least 5 characters").max(255, "email must be at most 255 characters").email("Invalid email format"),
  
  password: z.string().min(1, "password is required"),
  
  tenant_id: z.string().uuid("tenant_id format is invalid").optional().nullable(),
});

// Verify Email Schema
const VerifyEmailSchema = z.object({
  token: z.string().min(1, "token is required"),
});

// Resend Verification Schema
const ResendVerificationSchema = z.object({
  email: z.string().min(1, "email is required").min(5, "email must be at least 5 characters").max(255, "email must be at most 255 characters").email("Invalid email format"),
});

// Forgot Password Schema
const ForgotPasswordSchema = z.object({
  email: z.string().min(1, "email is required").min(5, "email must be at least 5 characters").max(255, "email must be at most 255 characters").email("Invalid email format"),
});

// Reset Password Schema
const ResetPasswordSchema = z.object({
  token: z.string().min(1, "token is required"),
  
  password: z.string().min(1, "password is required").min(8, "password must be at least 8 characters").max(128, "password must be at most 128 characters"),
});

// Change Password Schema
const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "current_password is required"),
  
  new_password: z.string().min(1, "new_password is required").min(8, "new_password must be at least 8 characters").max(128, "new_password must be at most 128 characters"),
}).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: "new_password must be different from current_password",
    path: ["new_password"]
  }
);

// Refresh Token Schema
const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "refresh_token is required"),
});

// Session Params Schema
const SessionParamsSchema = z.object({
  sessionId: z.string().uuid("sessionId format is invalid"),
});

// Create Service Token Schema
const CreateServiceTokenSchema = z.object({
  duration: z.string().optional(),
  access_token: z.string().optional(),
  accessToken: z.string().optional()
});

// Revoke Service Token Schema
const RevokeServiceTokenSchema = z.object({
  token: z.string().optional(),
  service_token: z.string().optional(),
  serviceToken: z.string().optional()
});

module.exports = {
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  RefreshTokenSchema,
  SessionParamsSchema,
  CreateServiceTokenSchema,
  RevokeServiceTokenSchema
};
