# Notification Service Testing & Test Cases

This document describes the testing strategy, scenarios, and manual/automated test cases for verifying the Notification Service functionality in QAssure.

---

## 1. Test Strategy

Quality assurance for notifications focuses on ensuring delivery correctness, template rendering accuracy, user preferences compliance, and real-time reliability.

- **Unit Testing**: Validates isolated logic including template variables replacement, timezone-aware quiet hours calculations, and template fallbacks.
- **Integration Testing**: Assesses the real-time push channel, database inserts, preferences syncing, and the SMTP dispatch flow.
- **System/End-to-End Testing**: Verifies that actions in external modules (Workflow, CAPA, Training) correctly trigger notifications.

---

## 2. Key Test Cases

### TC-NOTIF-001: Global Template Fallback Resolution
- **Description**: Verify that the resolver correctly retrieves a global template when no tenant override is present.
- **Steps**:
  1. Trigger `sendFromTemplate` for a registered event code.
  2. Ensure the tenant has no template override record.
  3. Validate that the resolved title and body correspond to the system global default template.

### TC-NOTIF-002: Tenant Template Custom Override
- **Description**: Verify that a tenant admin can override a template, and the service uses the override.
- **Steps**:
  1. Create a custom template override for a tenant for the code `capa_assigned`.
  2. Trigger `sendFromTemplate` for a user of that tenant.
  3. Validate that the rendered message matches the tenant's override rather than the global default.

### TC-NOTIF-003: User Preferences Channel Exclusion
- **Description**: Verify that notification channels are bypassed if the user disables them.
- **Steps**:
  1. Update a test user's preferences to disable `email` for the category `workflow`.
  2. Trigger a workflow task assignment notification.
  3. Verify that the notification record is saved and pushed to WebSockets (In-App), but no call is made to the email service.

### TC-NOTIF-004: Quiet Hours Email Suppression
- **Description**: Verify that email notifications are held back during quiet hours.
- **Steps**:
  1. Set user quiet hours to encompass the current system time.
  2. Trigger a notification with both `in_app` and `email` channels enabled.
  3. Verify that the in-app notification is delivered, but the email dispatch is suppressed/held.

### TC-NOTIF-005: Real-time WebSocket Push
- **Description**: Verify that online users receive real-time notifications and unread count bumps.
- **Steps**:
  1. Connect a test client socket to the WebSocket port using a valid JWT token.
  2. Send a notification to the user's ID.
  3. Verify that the client receives a `'notification'` event packet containing the alert and a `'unread_count'` event packet.
