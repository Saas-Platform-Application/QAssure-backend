# QAssure.ai - Complete API Endpoints Specification
## Backend Requirements for Web Application

**Document Version:** 1.0  
**Date:** December 24, 2025  
**Purpose:** Define all API endpoints needed to support the Management Console Web Application

---

## Executive Summary

### Gap Analysis vs Previous Roadmap

| Feature Area | In Previous Roadmap | Missing Endpoints | Status |
|--------------|--------------------|--------------------|--------|
| Main Dashboard | ❌ 10% | 90% missing | **CRITICAL** |
| Module Management | ⚠️ 30% | 70% missing | **HIGH** |
| AI Management | ⚠️ 40% | 60% missing | **HIGH** |
| Tenant Management | ⚠️ 25% | 75% missing | **CRITICAL** |
| User Management | ⚠️ 35% | 65% missing | **HIGH** |
| Monitoring & Troubleshooting | ⚠️ 30% | 70% missing | **HIGH** |
| Reporting & Analytics | ❌ 0% | 100% missing | **CRITICAL** |
| System Configuration | ⚠️ 20% | 80% missing | **HIGH** |
| Real-time Features | ❌ 0% | 100% missing | **CRITICAL** |

### Critical Missing Components

1. **WebSocket/SSE Server** - Real-time updates (not in roadmap)
2. **Dashboard Aggregation Service** - Health scores, metrics (not in roadmap)
3. **Report Generation Service** - PDF/Excel export (not in roadmap)
4. **Scheduled Jobs Service** - Report delivery, cleanup (not in roadmap)
5. **Branding/Whitelabel Service** - Tenant customization (not in roadmap)
6. **Notification Service** - Email, Slack, PagerDuty, SMS (partially in roadmap)

---

## 1. Authentication & Authorization APIs

### 1.1 Authentication Endpoints

```
POST   /api/v1/auth/login                    # Email/password login
POST   /api/v1/auth/logout                   # Logout (invalidate token)
POST   /api/v1/auth/refresh                  # Refresh access token
POST   /api/v1/auth/forgot-password          # Request password reset
POST   /api/v1/auth/reset-password           # Reset password with token
POST   /api/v1/auth/verify-email             # Verify email address
GET    /api/v1/auth/me                       # Get current user profile
PUT    /api/v1/auth/me                       # Update current user profile
PUT    /api/v1/auth/me/password              # Change password

# OAuth 2.0 Endpoints
GET    /api/v1/auth/oauth/google             # Initiate Google OAuth
GET    /api/v1/auth/oauth/google/callback    # Google OAuth callback
GET    /api/v1/auth/oauth/microsoft          # Initiate Microsoft OAuth
GET    /api/v1/auth/oauth/microsoft/callback # Microsoft OAuth callback
GET    /api/v1/auth/oauth/okta               # Initiate Okta OAuth
GET    /api/v1/auth/oauth/okta/callback      # Okta OAuth callback

# SAML 2.0 Endpoints
GET    /api/v1/auth/saml/login               # Initiate SAML SSO
POST   /api/v1/auth/saml/callback            # SAML assertion callback
GET    /api/v1/auth/saml/metadata            # SP metadata for IdP config

# MFA Endpoints
POST   /api/v1/auth/mfa/setup                # Setup MFA (get QR code)
POST   /api/v1/auth/mfa/verify               # Verify MFA code
POST   /api/v1/auth/mfa/disable              # Disable MFA
GET    /api/v1/auth/mfa/recovery-codes       # Get recovery codes
POST   /api/v1/auth/mfa/recovery-codes/regenerate  # Regenerate recovery codes

# Session Management
GET    /api/v1/auth/sessions                 # List active sessions
DELETE /api/v1/auth/sessions/:sessionId      # Revoke specific session
DELETE /api/v1/auth/sessions                 # Revoke all sessions (logout everywhere)
```

### 1.2 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| Basic Auth | ⚠️ Partial | JWT service exists, endpoints need creation |
| OAuth 2.0 | ❌ Missing | Was in Phase 3 but no endpoints defined |
| SAML 2.0 | ❌ Missing | Was in Phase 3 but no endpoints defined |
| MFA | ❌ Missing | Was in Phase 3 but no endpoints defined |
| Sessions | ⚠️ Partial | Service exists, endpoints need creation |

---

## 2. Main Dashboard APIs

### 2.1 Dashboard Endpoints

```
# Platform Health
GET    /api/v1/dashboard/health              # Overall platform health score (0-100)
GET    /api/v1/dashboard/health/details      # Detailed health breakdown

# Module Status
GET    /api/v1/dashboard/modules/status      # All modules with status
GET    /api/v1/dashboard/modules/:moduleId/status  # Single module status

# Real-time Metrics
GET    /api/v1/dashboard/metrics/realtime    # Current metrics snapshot
WS     /api/v1/dashboard/metrics/stream      # WebSocket for live metrics

# Recent Alerts
GET    /api/v1/dashboard/alerts/recent       # Recent alerts (last 24h)
GET    /api/v1/dashboard/alerts/active       # Currently active alerts

# AI Usage Summary
GET    /api/v1/dashboard/ai/summary          # AI usage summary (today)
GET    /api/v1/dashboard/ai/summary?range=week  # AI usage for date range

# Quick Actions
GET    /api/v1/dashboard/quick-actions       # Available quick actions for user
POST   /api/v1/dashboard/quick-actions/:actionId  # Execute quick action

# Activity Feed
GET    /api/v1/dashboard/activity            # Recent platform activity
WS     /api/v1/dashboard/activity/stream     # Real-time activity stream
```

### 2.2 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| Platform Health | ⚠️ Partial | Health service exists, no aggregation |
| Module Status | ❌ Missing | Module registry exists, no status API |
| Real-time Metrics | ❌ Missing | **WebSocket not in roadmap** |
| Recent Alerts | ❌ Missing | Alert rules exist, no API |
| AI Usage Summary | ⚠️ Partial | Cost tracking exists, no summary API |
| Quick Actions | ❌ Missing | Not in roadmap |
| Activity Feed | ❌ Missing | **WebSocket not in roadmap** |

---

## 3. Module Management APIs

### 3.1 Module Catalog

```
# Module CRUD
GET    /api/v1/modules                       # List all modules (with filters)
GET    /api/v1/modules/:moduleId             # Get module details
POST   /api/v1/modules                       # Register new module
PUT    /api/v1/modules/:moduleId             # Update module config
DELETE /api/v1/modules/:moduleId             # Unregister module

# Module Search & Filter
GET    /api/v1/modules?status=active         # Filter by status
GET    /api/v1/modules?search=clinical       # Search by name/description
GET    /api/v1/modules?technology=java       # Filter by technology

# Module Details
GET    /api/v1/modules/:moduleId/health      # Module health details
GET    /api/v1/modules/:moduleId/metrics     # Module performance metrics
GET    /api/v1/modules/:moduleId/dependencies # Module dependencies
GET    /api/v1/modules/:moduleId/dependents  # Modules that depend on this
GET    /api/v1/modules/:moduleId/api-docs    # OpenAPI specification
```

### 3.2 Deployment Management

```
# Version Management
GET    /api/v1/modules/:moduleId/versions    # List all versions
GET    /api/v1/modules/:moduleId/versions/:version  # Version details
GET    /api/v1/modules/:moduleId/versions/:version/changelog  # Changelog

# Deployment
POST   /api/v1/modules/:moduleId/deploy      # Deploy new version
GET    /api/v1/modules/:moduleId/deployments # Deployment history
GET    /api/v1/modules/:moduleId/deployments/:deploymentId  # Deployment details
GET    /api/v1/modules/:moduleId/deployments/:deploymentId/status  # Deployment status
POST   /api/v1/modules/:moduleId/deployments/:deploymentId/rollback  # Rollback

# Deployment Approval (optional workflow)
GET    /api/v1/modules/:moduleId/deployments/pending  # Pending approvals
POST   /api/v1/modules/:moduleId/deployments/:deploymentId/approve
POST   /api/v1/modules/:moduleId/deployments/:deploymentId/reject

# Traffic Management
PUT    /api/v1/modules/:moduleId/traffic     # Adjust traffic split
GET    /api/v1/modules/:moduleId/traffic     # Current traffic distribution
```

### 3.3 Lifecycle Management

```
# Lifecycle State
GET    /api/v1/modules/:moduleId/lifecycle   # Current lifecycle state
PUT    /api/v1/modules/:moduleId/lifecycle   # Transition to new state
GET    /api/v1/modules/:moduleId/lifecycle/history  # State transition history

# Lifecycle Actions
POST   /api/v1/modules/:moduleId/suspend     # Suspend module
POST   /api/v1/modules/:moduleId/resume      # Resume suspended module
POST   /api/v1/modules/:moduleId/deprecate   # Mark as deprecated
POST   /api/v1/modules/:moduleId/retire      # Retire module
```

### 3.4 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| Module CRUD | ⚠️ Partial | Basic CRUD exists |
| Module Search | ❌ Missing | No search/filter |
| Module Details | ⚠️ Partial | Health exists, others missing |
| Version Management | ❌ Missing | Not in roadmap |
| Deployment | ❌ Missing | Mentioned but no endpoints |
| Deployment Approval | ❌ Missing | Not in roadmap |
| Traffic Management | ❌ Missing | Not in roadmap |
| Lifecycle | ⚠️ Partial | Service exists, no endpoints |

---

## 4. AI Management APIs

### 4.1 AI Providers

```
# Provider Management
GET    /api/v1/ai/providers                  # List configured providers
GET    /api/v1/ai/providers/:providerId      # Provider details
POST   /api/v1/ai/providers                  # Add new provider
PUT    /api/v1/ai/providers/:providerId      # Update provider config
DELETE /api/v1/ai/providers/:providerId      # Remove provider
GET    /api/v1/ai/providers/:providerId/health  # Provider health status

# Model Management
GET    /api/v1/ai/models                     # List all available models
GET    /api/v1/ai/models/:modelId            # Model details
PUT    /api/v1/ai/models/:modelId/config     # Configure model settings

# Model Routing
GET    /api/v1/ai/routing                    # Current routing configuration
PUT    /api/v1/ai/routing                    # Update routing rules
GET    /api/v1/ai/routing/rules              # List routing rules
POST   /api/v1/ai/routing/rules              # Add routing rule
PUT    /api/v1/ai/routing/rules/:ruleId      # Update routing rule
DELETE /api/v1/ai/routing/rules/:ruleId      # Delete routing rule

# Fallback Configuration
GET    /api/v1/ai/fallback                   # Fallback configuration
PUT    /api/v1/ai/fallback                   # Update fallback settings

# Spending Limits
GET    /api/v1/ai/limits                     # Current spending limits
PUT    /api/v1/ai/limits                     # Update spending limits
```

### 4.2 Prompt Management

```
# Prompt Templates CRUD
GET    /api/v1/ai/prompts                    # List all prompts
GET    /api/v1/ai/prompts/:promptId          # Get prompt details
POST   /api/v1/ai/prompts                    # Create new prompt
PUT    /api/v1/ai/prompts/:promptId          # Update prompt
DELETE /api/v1/ai/prompts/:promptId          # Delete prompt
POST   /api/v1/ai/prompts/:promptId/clone    # Clone prompt

# Prompt Versioning
GET    /api/v1/ai/prompts/:promptId/versions # List versions
GET    /api/v1/ai/prompts/:promptId/versions/:version  # Get specific version
POST   /api/v1/ai/prompts/:promptId/versions # Create new version
GET    /api/v1/ai/prompts/:promptId/versions/compare  # Compare two versions
POST   /api/v1/ai/prompts/:promptId/versions/:version/rollback  # Rollback

# Prompt Testing
POST   /api/v1/ai/prompts/:promptId/test     # Test prompt with sample input
POST   /api/v1/ai/prompts/playground         # Freeform prompt testing
GET    /api/v1/ai/prompts/:promptId/test-cases  # Saved test cases
POST   /api/v1/ai/prompts/:promptId/test-cases  # Create test case
DELETE /api/v1/ai/prompts/:promptId/test-cases/:testId  # Delete test case
POST   /api/v1/ai/prompts/:promptId/test-cases/run  # Run all test cases

# A/B Testing
GET    /api/v1/ai/prompts/:promptId/ab-tests # List A/B tests
POST   /api/v1/ai/prompts/:promptId/ab-tests # Create A/B test
GET    /api/v1/ai/prompts/:promptId/ab-tests/:testId  # A/B test details
PUT    /api/v1/ai/prompts/:promptId/ab-tests/:testId  # Update A/B test
GET    /api/v1/ai/prompts/:promptId/ab-tests/:testId/results  # A/B results
```

### 4.3 Knowledge Base (RAG)

```
# Collections
GET    /api/v1/ai/knowledge/collections      # List collections
POST   /api/v1/ai/knowledge/collections      # Create collection
GET    /api/v1/ai/knowledge/collections/:collectionId
PUT    /api/v1/ai/knowledge/collections/:collectionId
DELETE /api/v1/ai/knowledge/collections/:collectionId

# Documents
GET    /api/v1/ai/knowledge/documents        # List all documents
GET    /api/v1/ai/knowledge/documents/:documentId
POST   /api/v1/ai/knowledge/documents        # Upload document
DELETE /api/v1/ai/knowledge/documents/:documentId
GET    /api/v1/ai/knowledge/documents/:documentId/status  # Processing status
GET    /api/v1/ai/knowledge/documents/:documentId/chunks  # View chunks

# Search
POST   /api/v1/ai/knowledge/search           # Semantic search
POST   /api/v1/ai/knowledge/search/test      # Test search query
```

### 4.4 AI Cost Tracking

```
# Cost Overview
GET    /api/v1/ai/costs                      # Overall cost summary
GET    /api/v1/ai/costs/daily                # Daily cost breakdown
GET    /api/v1/ai/costs/by-provider          # Costs by provider
GET    /api/v1/ai/costs/by-module            # Costs by module
GET    /api/v1/ai/costs/by-tenant            # Costs by tenant
GET    /api/v1/ai/costs/by-usecase           # Costs by use case
GET    /api/v1/ai/costs/trends               # Cost trends over time

# Cost Alerts
GET    /api/v1/ai/costs/alerts               # Cost alert configuration
PUT    /api/v1/ai/costs/alerts               # Update cost alerts
GET    /api/v1/ai/costs/alerts/history       # Alert history
```

### 4.5 AI Completions

```
# Completion API (for modules/clients)
POST   /api/v1/ai/completions                # Create completion
GET    /api/v1/ai/completions/:completionId  # Get completion details
GET    /api/v1/ai/completions                # List completions (with filters)
```

### 4.6 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| Provider Management | ⚠️ Partial | Gateway exists, CRUD missing |
| Model Management | ❌ Missing | Model router service, no endpoints |
| Model Routing | ❌ Missing | Service exists, no endpoints |
| Prompt CRUD | ⚠️ Partial | DB table exists, basic CRUD |
| Prompt Versioning | ❌ Missing | Not in roadmap |
| Prompt Testing | ❌ Missing | Not in roadmap |
| A/B Testing | ❌ Missing | Not in roadmap |
| Knowledge Base | ⚠️ Partial | RAG service, no management endpoints |
| Cost Tracking | ⚠️ Partial | Service exists, limited endpoints |
| Completions | ⚠️ Partial | Basic completion only |

---

## 5. Tenant Management APIs

### 5.1 Tenant CRUD

```
# Tenant Management
GET    /api/v1/tenants                       # List all tenants
GET    /api/v1/tenants/:tenantId             # Get tenant details
POST   /api/v1/tenants                       # Create tenant (onboarding wizard)
PUT    /api/v1/tenants/:tenantId             # Update tenant
DELETE /api/v1/tenants/:tenantId             # Delete tenant (soft delete)

# Tenant Search & Filter
GET    /api/v1/tenants?status=active         # Filter by status
GET    /api/v1/tenants?plan=enterprise       # Filter by subscription
GET    /api/v1/tenants?search=acme           # Search by name
```

### 5.2 Tenant Onboarding

```
# Onboarding Wizard
POST   /api/v1/tenants/onboarding/validate/company  # Validate step 1
POST   /api/v1/tenants/onboarding/validate/subscription  # Validate step 2
POST   /api/v1/tenants/onboarding/validate/modules  # Validate step 3
POST   /api/v1/tenants/onboarding/validate/admin    # Validate step 4
POST   /api/v1/tenants/onboarding/validate/integration  # Validate step 5
POST   /api/v1/tenants/onboarding/complete   # Complete onboarding
POST   /api/v1/tenants/:tenantId/welcome-email  # Resend welcome email
```

### 5.3 Tenant Dashboard

```
# Tenant Overview
GET    /api/v1/tenants/:tenantId/dashboard   # Tenant dashboard data
GET    /api/v1/tenants/:tenantId/health      # Tenant health status
GET    /api/v1/tenants/:tenantId/usage       # Usage metrics
GET    /api/v1/tenants/:tenantId/usage/history  # Historical usage

# Subscription
GET    /api/v1/tenants/:tenantId/subscription  # Subscription details
PUT    /api/v1/tenants/:tenantId/subscription  # Update subscription
GET    /api/v1/tenants/:tenantId/subscription/usage  # Usage vs limits
```

### 5.4 Tenant Modules

```
# Module Access
GET    /api/v1/tenants/:tenantId/modules     # Enabled modules
PUT    /api/v1/tenants/:tenantId/modules     # Enable/disable modules
GET    /api/v1/tenants/:tenantId/modules/:moduleId/config  # Module config
PUT    /api/v1/tenants/:tenantId/modules/:moduleId/config  # Update config
```

### 5.5 Tenant QMS Integration

```
# QMS Connections
GET    /api/v1/tenants/:tenantId/integrations/qms  # List QMS connections
GET    /api/v1/tenants/:tenantId/integrations/qms/:connectionId
POST   /api/v1/tenants/:tenantId/integrations/qms  # Add QMS connection
PUT    /api/v1/tenants/:tenantId/integrations/qms/:connectionId
DELETE /api/v1/tenants/:tenantId/integrations/qms/:connectionId

# QMS Setup Wizard
GET    /api/v1/integrations/qms/supported    # List supported QMS systems
POST   /api/v1/tenants/:tenantId/integrations/qms/test  # Test connection
GET    /api/v1/tenants/:tenantId/integrations/qms/:connectionId/fields  # Available fields
PUT    /api/v1/tenants/:tenantId/integrations/qms/:connectionId/mappings  # Field mappings
GET    /api/v1/tenants/:tenantId/integrations/qms/:connectionId/sync-config
PUT    /api/v1/tenants/:tenantId/integrations/qms/:connectionId/sync-config

# Sync Management
GET    /api/v1/tenants/:tenantId/integrations/qms/:connectionId/sync/status
POST   /api/v1/tenants/:tenantId/integrations/qms/:connectionId/sync/trigger
GET    /api/v1/tenants/:tenantId/integrations/qms/:connectionId/sync/history
GET    /api/v1/tenants/:tenantId/integrations/qms/:connectionId/sync/errors
```

### 5.6 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| Tenant CRUD | ⚠️ Partial | Basic CRUD exists |
| Tenant Search | ❌ Missing | No search/filter |
| Onboarding Wizard | ❌ Missing | Not in roadmap |
| Tenant Dashboard | ❌ Missing | Not in roadmap |
| Subscription | ❌ Missing | Not in roadmap |
| Tenant Modules | ❌ Missing | Not in roadmap |
| QMS Integration | ⚠️ Partial | Adapter framework, no tenant endpoints |
| Sync Management | ⚠️ Partial | Sync service exists, no endpoints |

---

## 6. User & Access Management APIs

### 6.1 User Management

```
# User CRUD
GET    /api/v1/users                         # List users (with filters)
GET    /api/v1/users/:userId                 # Get user details
POST   /api/v1/users                         # Create user
PUT    /api/v1/users/:userId                 # Update user
DELETE /api/v1/users/:userId                 # Deactivate user

# User Search & Filter
GET    /api/v1/users?role=admin              # Filter by role
GET    /api/v1/users?status=active           # Filter by status
GET    /api/v1/users?search=john             # Search by name/email
GET    /api/v1/users?tenant=:tenantId        # Filter by tenant

# User Actions
POST   /api/v1/users/:userId/activate        # Activate user
POST   /api/v1/users/:userId/deactivate      # Deactivate user
POST   /api/v1/users/:userId/unlock          # Unlock locked account
POST   /api/v1/users/:userId/reset-password  # Admin reset password
POST   /api/v1/users/:userId/resend-invite   # Resend invitation email

# User Details
GET    /api/v1/users/:userId/sessions        # User's active sessions
GET    /api/v1/users/:userId/login-history   # Login history
GET    /api/v1/users/:userId/activity        # Activity log
GET    /api/v1/users/:userId/permissions     # Effective permissions
```

### 6.2 Role Management

```
# Role CRUD
GET    /api/v1/roles                         # List all roles
GET    /api/v1/roles/:roleId                 # Get role details
POST   /api/v1/roles                         # Create custom role
PUT    /api/v1/roles/:roleId                 # Update role
DELETE /api/v1/roles/:roleId                 # Delete role (if not system)

# Role Permissions
GET    /api/v1/roles/:roleId/permissions     # Get role permissions
PUT    /api/v1/roles/:roleId/permissions     # Update role permissions

# Role Users
GET    /api/v1/roles/:roleId/users           # Users with this role
POST   /api/v1/roles/:roleId/users           # Assign role to user
DELETE /api/v1/roles/:roleId/users/:userId   # Remove role from user
```

### 6.3 Permission Management

```
# Permission Resources
GET    /api/v1/permissions/resources         # List all resources
GET    /api/v1/permissions/actions           # List all actions
GET    /api/v1/permissions/matrix            # Full permission matrix (for editor)

# User-Role Assignment
GET    /api/v1/users/:userId/roles           # User's roles
POST   /api/v1/users/:userId/roles           # Assign role to user
DELETE /api/v1/users/:userId/roles/:roleId   # Remove role from user
PUT    /api/v1/users/:userId/roles/:roleId   # Update assignment (expiry, module)
```

### 6.4 SSO Configuration

```
# SSO Settings
GET    /api/v1/auth/sso/config               # Current SSO configuration
PUT    /api/v1/auth/sso/config               # Update SSO configuration
GET    /api/v1/auth/sso/providers            # Available SSO providers
POST   /api/v1/auth/sso/test                 # Test SSO configuration

# Per-Tenant SSO
GET    /api/v1/tenants/:tenantId/sso/config  # Tenant SSO config
PUT    /api/v1/tenants/:tenantId/sso/config  # Update tenant SSO
```

### 6.5 API Keys

```
# API Key Management
GET    /api/v1/api-keys                      # List API keys
GET    /api/v1/api-keys/:keyId               # Get key details (not secret)
POST   /api/v1/api-keys                      # Create API key
PUT    /api/v1/api-keys/:keyId               # Update key (name, permissions)
DELETE /api/v1/api-keys/:keyId               # Revoke API key
POST   /api/v1/api-keys/:keyId/regenerate    # Regenerate key secret
GET    /api/v1/api-keys/:keyId/usage         # Key usage statistics
```

### 6.6 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| User CRUD | ⚠️ Partial | Basic CRUD exists |
| User Search | ❌ Missing | No search/filter endpoints |
| User Actions | ❌ Missing | Not in roadmap |
| User Details | ⚠️ Partial | Sessions exist, others missing |
| Role CRUD | ⚠️ Partial | Basic CRUD exists |
| Role Permissions | ⚠️ Partial | Permission service exists |
| Role Users | ❌ Missing | Not in roadmap |
| Permission Matrix | ❌ Missing | Not in roadmap |
| SSO Config | ❌ Missing | SAML/OAuth services, no config endpoints |
| API Keys | ⚠️ Partial | Table exists, limited endpoints |

---

## 7. Monitoring & Troubleshooting APIs

### 7.1 System Health

```
# Health Endpoints
GET    /api/v1/health                        # Basic health check
GET    /api/v1/health/live                   # Kubernetes liveness probe
GET    /api/v1/health/ready                  # Kubernetes readiness probe
GET    /api/v1/health/detailed               # Detailed health with all components

# Component Health
GET    /api/v1/monitoring/components         # List all components
GET    /api/v1/monitoring/components/:componentId  # Component health
GET    /api/v1/monitoring/components/:componentId/metrics  # Component metrics

# Infrastructure Health
GET    /api/v1/monitoring/servers            # Server health (CPU, memory, disk)
GET    /api/v1/monitoring/databases          # Database health
GET    /api/v1/monitoring/cache              # Redis cache health
GET    /api/v1/monitoring/queues             # Kafka queue health
GET    /api/v1/monitoring/ai                 # AI provider health
```

### 7.2 Metrics

```
# Metrics API
GET    /api/v1/monitoring/metrics            # Available metrics list
GET    /api/v1/monitoring/metrics/:metricName  # Get metric values
GET    /api/v1/monitoring/metrics/:metricName/history  # Historical data
POST   /api/v1/monitoring/metrics/query      # Custom PromQL query

# Prometheus Integration
GET    /metrics                              # Prometheus scrape endpoint

# Real-time Metrics
WS     /api/v1/monitoring/metrics/stream     # WebSocket for live metrics
```

### 7.3 Log Viewer

```
# Log Search
GET    /api/v1/logs                          # Search logs (with filters)
GET    /api/v1/logs/:logId                   # Get specific log entry
POST   /api/v1/logs/search                   # Advanced log search
GET    /api/v1/logs/stream                   # SSE for real-time logs
WS     /api/v1/logs/stream                   # WebSocket for real-time logs

# Log Filters
GET    /api/v1/logs/filters/modules          # Available module filters
GET    /api/v1/logs/filters/levels           # Available log levels
GET    /api/v1/logs/filters/saved            # Saved search filters
POST   /api/v1/logs/filters/saved            # Save search filter
DELETE /api/v1/logs/filters/saved/:filterId  # Delete saved filter

# Log Export
POST   /api/v1/logs/export                   # Export logs to file
GET    /api/v1/logs/exports/:exportId        # Download exported logs
```

### 7.4 Request Tracing

```
# Trace Search
GET    /api/v1/traces                        # Search traces
GET    /api/v1/traces/:traceId               # Get full trace details
GET    /api/v1/traces/:traceId/spans         # Get all spans in trace
GET    /api/v1/traces/:traceId/timeline      # Visual timeline data

# Trace Filters
GET    /api/v1/traces?service=aice           # Filter by service
GET    /api/v1/traces?minDuration=1000       # Filter by duration
GET    /api/v1/traces?hasError=true          # Filter by error status
GET    /api/v1/traces?userId=:userId         # Filter by user
```

### 7.5 Alerts

```
# Alert Rules
GET    /api/v1/alerts/rules                  # List alert rules
GET    /api/v1/alerts/rules/:ruleId          # Get rule details
POST   /api/v1/alerts/rules                  # Create alert rule
PUT    /api/v1/alerts/rules/:ruleId          # Update alert rule
DELETE /api/v1/alerts/rules/:ruleId          # Delete alert rule
POST   /api/v1/alerts/rules/:ruleId/test     # Test alert rule

# Alert Instances
GET    /api/v1/alerts                        # List active alerts
GET    /api/v1/alerts/:alertId               # Get alert details
POST   /api/v1/alerts/:alertId/acknowledge   # Acknowledge alert
POST   /api/v1/alerts/:alertId/resolve       # Resolve alert
POST   /api/v1/alerts/:alertId/silence       # Silence alert temporarily
GET    /api/v1/alerts/history                # Alert history

# Notification Channels
GET    /api/v1/alerts/channels               # List notification channels
POST   /api/v1/alerts/channels               # Add notification channel
PUT    /api/v1/alerts/channels/:channelId    # Update channel
DELETE /api/v1/alerts/channels/:channelId    # Remove channel
POST   /api/v1/alerts/channels/:channelId/test  # Test channel
```

### 7.6 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| Health Endpoints | ⚠️ Partial | Basic health exists |
| Component Health | ❌ Missing | Not in roadmap |
| Infrastructure Health | ❌ Missing | Not in roadmap |
| Metrics API | ⚠️ Partial | Prometheus exists, query missing |
| Real-time Metrics | ❌ Missing | **WebSocket not in roadmap** |
| Log Viewer | ❌ Missing | ELK planned, no API |
| Log Export | ❌ Missing | Not in roadmap |
| Request Tracing | ❌ Missing | Jaeger planned, no API |
| Alert Rules | ❌ Missing | Not in roadmap |
| Alert Instances | ❌ Missing | Not in roadmap |
| Notification Channels | ❌ Missing | Mentioned, no endpoints |

---

## 8. Reporting & Analytics APIs

### 8.1 Usage Reports

```
# Usage Reports
GET    /api/v1/reports/usage                 # Usage summary
GET    /api/v1/reports/usage/api-calls       # API call statistics
GET    /api/v1/reports/usage/users           # User activity stats
GET    /api/v1/reports/usage/features        # Feature usage
GET    /api/v1/reports/usage/storage         # Storage consumption
GET    /api/v1/reports/usage/ai              # AI usage details

# Usage by Dimension
GET    /api/v1/reports/usage/by-module       # Breakdown by module
GET    /api/v1/reports/usage/by-tenant       # Breakdown by tenant
GET    /api/v1/reports/usage/by-user         # Breakdown by user
GET    /api/v1/reports/usage/trends          # Usage trends over time
```

### 8.2 Performance Reports

```
# Performance Reports
GET    /api/v1/reports/performance           # Performance summary
GET    /api/v1/reports/performance/availability  # Uptime statistics
GET    /api/v1/reports/performance/response-time  # Response time stats
GET    /api/v1/reports/performance/error-rate  # Error rate stats
GET    /api/v1/reports/performance/sla       # SLA compliance
GET    /api/v1/reports/performance/by-module # Performance by module
GET    /api/v1/reports/performance/trends    # Performance trends
```

### 8.3 Cost Reports

```
# Cost Reports
GET    /api/v1/reports/costs                 # Cost summary
GET    /api/v1/reports/costs/infrastructure  # Infrastructure costs
GET    /api/v1/reports/costs/ai              # AI costs
GET    /api/v1/reports/costs/by-tenant       # Cost allocation by tenant
GET    /api/v1/reports/costs/by-module       # Cost allocation by module
GET    /api/v1/reports/costs/trends          # Cost trends
GET    /api/v1/reports/costs/forecast        # Cost forecast
```

### 8.4 Report Export & Scheduling

```
# Report Export
POST   /api/v1/reports/export                # Generate export
GET    /api/v1/reports/exports               # List exports
GET    /api/v1/reports/exports/:exportId     # Get export status
GET    /api/v1/reports/exports/:exportId/download  # Download export

# Scheduled Reports
GET    /api/v1/reports/schedules             # List scheduled reports
POST   /api/v1/reports/schedules             # Create scheduled report
PUT    /api/v1/reports/schedules/:scheduleId # Update schedule
DELETE /api/v1/reports/schedules/:scheduleId # Delete schedule
POST   /api/v1/reports/schedules/:scheduleId/run  # Run now
```

### 8.5 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| Usage Reports | ❌ Missing | **Not in roadmap at all** |
| Performance Reports | ❌ Missing | **Not in roadmap at all** |
| Cost Reports | ⚠️ Partial | AI costs only |
| Report Export | ❌ Missing | **Not in roadmap at all** |
| Scheduled Reports | ❌ Missing | **Not in roadmap at all** |

---

## 9. System Configuration APIs

### 9.1 General Settings

```
# Platform Settings
GET    /api/v1/settings                      # All settings
GET    /api/v1/settings/general              # General settings
PUT    /api/v1/settings/general              # Update general settings

# Branding
GET    /api/v1/settings/branding             # Branding settings (logo, colors)
PUT    /api/v1/settings/branding             # Update branding
POST   /api/v1/settings/branding/logo        # Upload logo

# Email Settings
GET    /api/v1/settings/email                # Email/SMTP settings
PUT    /api/v1/settings/email                # Update email settings
POST   /api/v1/settings/email/test           # Send test email
```

### 9.2 Security Settings

```
# Password Policy
GET    /api/v1/settings/security/password    # Password policy
PUT    /api/v1/settings/security/password    # Update password policy

# MFA Settings
GET    /api/v1/settings/security/mfa         # MFA requirements
PUT    /api/v1/settings/security/mfa         # Update MFA settings

# IP Allowlist
GET    /api/v1/settings/security/ip-allowlist  # IP allowlist
PUT    /api/v1/settings/security/ip-allowlist  # Update allowlist

# Session Settings
GET    /api/v1/settings/security/sessions    # Session settings
PUT    /api/v1/settings/security/sessions    # Update session settings

# Rate Limiting
GET    /api/v1/settings/security/rate-limits # Rate limit config
PUT    /api/v1/settings/security/rate-limits # Update rate limits
```

### 9.3 Integration Settings

```
# API Gateway
GET    /api/v1/settings/integrations/gateway # Gateway settings
PUT    /api/v1/settings/integrations/gateway # Update gateway settings

# Event Bus
GET    /api/v1/settings/integrations/events  # Event bus settings
PUT    /api/v1/settings/integrations/events  # Update event settings

# External Services
GET    /api/v1/settings/integrations/external  # External service configs
PUT    /api/v1/settings/integrations/external  # Update external services

# Webhooks
GET    /api/v1/settings/webhooks             # Webhook configurations
POST   /api/v1/settings/webhooks             # Add webhook
PUT    /api/v1/settings/webhooks/:webhookId  # Update webhook
DELETE /api/v1/settings/webhooks/:webhookId  # Remove webhook
POST   /api/v1/settings/webhooks/:webhookId/test  # Test webhook
```

### 9.4 Audit Log

```
# Audit Log
GET    /api/v1/audit                         # Search audit logs
GET    /api/v1/audit/:entryId                # Get audit entry details
POST   /api/v1/audit/export                  # Export audit logs
GET    /api/v1/audit/exports/:exportId       # Download export

# Audit Filters
GET    /api/v1/audit/users                   # Users for filtering
GET    /api/v1/audit/actions                 # Action types for filtering
GET    /api/v1/audit/resources               # Resources for filtering
```

### 9.5 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| General Settings | ❌ Missing | Not in roadmap |
| Branding | ❌ Missing | Not in roadmap |
| Email Settings | ❌ Missing | Not in roadmap |
| Password Policy | ❌ Missing | Not in roadmap |
| MFA Settings | ❌ Missing | Not in roadmap |
| IP Allowlist | ⚠️ Stub | Middleware stub exists |
| Session Settings | ❌ Missing | Not in roadmap |
| Rate Limits | ⚠️ Partial | Service exists, no config endpoint |
| Integration Settings | ❌ Missing | Not in roadmap |
| Webhooks | ❌ Missing | Not in roadmap |
| Audit Log | ⚠️ Partial | Table exists, limited endpoints |

---

## 10. Real-time Features (WebSocket/SSE)

### 10.1 WebSocket Endpoints

```
# Real-time Connections
WS     /api/v1/ws                            # Main WebSocket connection
WS     /api/v1/ws/dashboard                  # Dashboard updates
WS     /api/v1/ws/logs                       # Real-time logs
WS     /api/v1/ws/metrics                    # Real-time metrics
WS     /api/v1/ws/alerts                     # Real-time alerts
WS     /api/v1/ws/deployments                # Deployment progress
WS     /api/v1/ws/sync                       # QMS sync progress
```

### 10.2 Server-Sent Events (SSE)

```
# SSE Endpoints (alternative to WebSocket)
GET    /api/v1/sse/events                    # General event stream
GET    /api/v1/sse/alerts                    # Alert stream
GET    /api/v1/sse/logs                      # Log stream
GET    /api/v1/sse/metrics                   # Metrics stream
```

### 10.3 Status: Previous Roadmap Coverage

| Endpoint Group | Previous Coverage | Notes |
|---------------|-------------------|-------|
| WebSocket Server | ❌ Missing | **CRITICAL - Not in roadmap** |
| SSE Support | ❌ Missing | **CRITICAL - Not in roadmap** |

---

## Summary: Complete Endpoint Count

### Total Endpoints Required

| Category | Endpoints | In Roadmap | Missing |
|----------|-----------|------------|---------|
| Authentication | 35 | 8 | 27 |
| Dashboard | 18 | 2 | 16 |
| Module Management | 32 | 6 | 26 |
| AI Management | 58 | 12 | 46 |
| Tenant Management | 42 | 5 | 37 |
| User Management | 38 | 8 | 30 |
| Monitoring | 45 | 6 | 39 |
| Reporting | 32 | 0 | 32 |
| Configuration | 35 | 3 | 32 |
| Real-time (WS/SSE) | 12 | 0 | 12 |
| **TOTAL** | **347** | **50** | **297** |

### Coverage: ~14% of required endpoints exist in codebase

---

## New Files Required for API Layer

```
src/
├── controllers/                      # EXTEND existing
│   ├── auth/
│   │   ├── auth.controller.js        # Login, logout, refresh
│   │   ├── oauth.controller.js       # OAuth callbacks
│   │   ├── saml.controller.js        # SAML callbacks
│   │   ├── mfa.controller.js         # MFA setup, verify
│   │   └── session.controller.js     # Session management
│   │
│   ├── dashboard/                    # NEW
│   │   ├── dashboard.controller.js   # Dashboard aggregation
│   │   └── quick-actions.controller.js
│   │
│   ├── modules/                      # EXTEND
│   │   ├── module.controller.js      # Module CRUD
│   │   ├── deployment.controller.js  # Deployments
│   │   ├── lifecycle.controller.js   # Lifecycle management
│   │   └── version.controller.js     # Version management
│   │
│   ├── ai/                           # EXTEND
│   │   ├── provider.controller.js    # AI provider management
│   │   ├── model.controller.js       # Model management
│   │   ├── routing.controller.js     # Model routing
│   │   ├── prompt.controller.js      # Prompt management
│   │   ├── prompt-test.controller.js # Prompt testing
│   │   ├── knowledge.controller.js   # RAG management
│   │   ├── cost.controller.js        # Cost tracking
│   │   └── completion.controller.js  # AI completions
│   │
│   ├── tenants/                      # EXTEND
│   │   ├── tenant.controller.js      # Tenant CRUD
│   │   ├── onboarding.controller.js  # Onboarding wizard
│   │   ├── subscription.controller.js # Subscriptions
│   │   ├── tenant-module.controller.js
│   │   └── tenant-integration.controller.js  # QMS setup
│   │
│   ├── users/                        # EXTEND
│   │   ├── user.controller.js        # User CRUD
│   │   ├── role.controller.js        # Role management
│   │   ├── permission.controller.js  # Permission management
│   │   ├── sso.controller.js         # SSO configuration
│   │   └── api-key.controller.js     # API key management
│   │
│   ├── monitoring/                   # NEW
│   │   ├── health.controller.js      # Health endpoints
│   │   ├── metrics.controller.js     # Metrics API
│   │   ├── logs.controller.js        # Log viewer
│   │   ├── traces.controller.js      # Request tracing
│   │   └── alerts.controller.js      # Alert management
│   │
│   ├── reports/                      # NEW
│   │   ├── usage.controller.js       # Usage reports
│   │   ├── performance.controller.js # Performance reports
│   │   ├── cost.controller.js        # Cost reports
│   │   └── export.controller.js      # Report export
│   │
│   └── settings/                     # NEW
│       ├── general.controller.js     # General settings
│       ├── branding.controller.js    # Branding
│       ├── security.controller.js    # Security settings
│       ├── integration.controller.js # Integration settings
│       └── audit.controller.js       # Audit log
│
├── services/                         # EXTEND existing
│   ├── dashboard/                    # NEW
│   │   ├── dashboard.service.js      # Aggregation service
│   │   └── quick-action.service.js
│   │
│   ├── reports/                      # NEW
│   │   ├── report.service.js         # Report generation
│   │   ├── usage-report.service.js
│   │   ├── performance-report.service.js
│   │   ├── cost-report.service.js
│   │   └── export.service.js         # PDF/Excel generation
│   │
│   ├── notifications/                # NEW
│   │   ├── notification.service.js   # Notification orchestration
│   │   ├── email.service.js          # Email sending
│   │   ├── slack.service.js          # Slack integration
│   │   ├── pagerduty.service.js      # PagerDuty integration
│   │   └── sms.service.js            # SMS (optional)
│   │
│   └── scheduler/                    # NEW
│       ├── scheduler.service.js      # Job scheduling
│       └── jobs/
│           ├── report.job.js         # Scheduled reports
│           ├── cleanup.job.js        # Data cleanup
│           └── health-check.job.js   # Scheduled health checks
│
├── websocket/                        # NEW - CRITICAL
│   ├── websocket.server.js           # WebSocket server
│   ├── handlers/
│   │   ├── dashboard.handler.js      # Dashboard updates
│   │   ├── logs.handler.js           # Log streaming
│   │   ├── metrics.handler.js        # Metrics streaming
│   │   ├── alerts.handler.js         # Alert streaming
│   │   └── deployment.handler.js     # Deployment progress
│   └── auth/
│       └── ws-auth.middleware.js     # WebSocket authentication
│
└── routes/                           # EXTEND existing
    ├── v1/
    │   ├── auth.routes.js            # Auth routes
    │   ├── dashboard.routes.js       # Dashboard routes
    │   ├── module.routes.js          # Module routes
    │   ├── ai.routes.js              # AI routes
    │   ├── tenant.routes.js          # Tenant routes
    │   ├── user.routes.js            # User routes
    │   ├── monitoring.routes.js      # Monitoring routes
    │   ├── reports.routes.js         # Report routes
    │   └── settings.routes.js        # Settings routes
    └── index.js                      # Route aggregation
```

---

## Additional Packages Required

```bash
# WebSocket
npm install socket.io ws --save

# Report Generation
npm install pdfkit exceljs puppeteer --save

# Job Scheduling
npm install node-cron bull --save

# Email
npm install nodemailer --save

# Slack/PagerDuty
npm install @slack/web-api @pagerduty/pdjs --save

# File Upload
npm install multer --save
```

---

## Recommended Phase Updates

### NEW Phase 17: API Layer Completion
**Duration:** 5 days

- Create all missing controllers
- Create all missing routes
- Implement request/response DTOs
- Add input validation for all endpoints
- Add pagination, filtering, sorting

### NEW Phase 18: Real-time Features
**Duration:** 3 days

- WebSocket server setup
- SSE fallback implementation
- Dashboard real-time updates
- Log streaming
- Metrics streaming
- Alert notifications

### NEW Phase 19: Reporting Service
**Duration:** 3 days

- Report generation service
- PDF export (pdfkit/puppeteer)
- Excel export (exceljs)
- Scheduled report delivery
- Report storage

### NEW Phase 20: Notification Service
**Duration:** 2 days

- Email service (nodemailer)
- Slack integration
- PagerDuty integration
- Notification preferences

---

## Final Summary

### Original Roadmap: 16 Phases, 44 days
### Updated Roadmap: 20 Phases, 57 days

### Key Additions

| Addition | Effort | Priority |
|----------|--------|----------|
| 297 new API endpoints | 5 days | **CRITICAL** |
| WebSocket/SSE server | 3 days | **CRITICAL** |
| Reporting service | 3 days | **HIGH** |
| Notification service | 2 days | **HIGH** |

---

*Document End - API Endpoints Specification*
