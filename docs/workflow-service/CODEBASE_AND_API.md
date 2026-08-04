# Workflow Engine Service - Codebase & API Documentation

---

## 1. Codebase Layout & File Mapping
*   **Routes**: `src/routes/workflow.routes.js`
    *   Maps routes for definition management, instance creation, history tracking, and task execution.
*   **Controller**: `src/controllers/workflow.controller.js`
    *   Unpacks requests, executes validation, and formats standard JSON envelopes.
*   **Service Layers**:
    *   `src/services/workflow-definition.service.js`: Manages definition blueprint templates, cloning, validation, and lifecycle.
    *   `src/services/workflow-engine.service.js`: Orchestrates execution state transitions, task assignments, and callbacks.
*   **Validation Schema**: `src/validation/workflow.schema.js`
    *   Defines Zod schemas for input validation.

---

## 2. API Endpoint Reference

### 2.1 Workflow Definitions

#### 2.1.1 Create Workflow Definition
*   **Endpoint**: `POST /api/v1/workflows/definitions`
*   **Access**: Requires `workflow:create` permission
*   **Request Body**:
    ```json
    {
      "name": "Standard Document Approval",
      "code": "standard_doc_approval",
      "entity_type": "document",
      "status": "draft",
      "steps": [
        {
          "step_code": "upload",
          "name": "Document Upload",
          "step_type": "initial",
          "assignee_type": "originator",
          "available_actions": ["submit"]
        },
        {
          "step_code": "review",
          "name": "Manager Review",
          "step_type": "task",
          "assignee_type": "role",
          "assignee_role_ids": ["a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d"],
          "requires_signature": true,
          "available_actions": ["approve", "reject"]
        },
        {
          "step_code": "approved",
          "name": "Approved",
          "step_type": "terminal"
        }
      ],
      "transitions": [
        {
          "from_step": "upload",
          "to_step": "review",
          "action": "submit"
        },
        {
          "from_step": "review",
          "to_step": "approved",
          "action": "approve"
        }
      ]
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Standard Document Approval",
        "status": "draft"
      }
    }
    ```

#### 2.1.2 List Workflow Definitions
*   **Endpoint**: `GET /api/v1/workflows/definitions`
*   **Access**: Requires `workflow:read` permission
*   **Query Parameters**:
    *   `status` (Optional): Filter by draft, active, or deprecated
    *   `limit` (Optional): Max records returned (default: 10)
    *   `offset` (Optional): Offset pointer (default: 0)

#### 2.1.3 Get Workflow Definition by ID
*   **Endpoint**: `GET /api/v1/workflows/definitions/:id`
*   **Access**: Requires `workflow:read` permission

#### 2.1.4 Update Workflow Definition
*   **Endpoint**: `PUT /api/v1/workflows/definitions/:id`
*   **Access**: Requires `workflow:create` permission
*   **Request Body**:
    ```json
    {
      "name": "Updated Document Approval Name",
      "description": "Updated blueprint details",
      "status": "draft",
      "is_default": true
    }
    ```

#### 2.1.5 Delete Workflow Definition
*   **Endpoint**: `DELETE /api/v1/workflows/definitions/:id`
*   **Access**: Requires `workflow:admin` permission

#### 2.1.6 Clone Workflow Definition
*   **Endpoint**: `POST /api/v1/workflows/definitions/:id/clone`
*   **Access**: Requires `workflow:create` permission

#### 2.1.7 Activate Workflow Definition
*   **Endpoint**: `POST /api/v1/workflows/definitions/:id/activate`
*   **Access**: Requires `workflow:create` permission

#### 2.1.8 Deprecate Workflow Definition
*   **Endpoint**: `POST /api/v1/workflows/definitions/:id/deprecate`
*   **Access**: Requires `workflow:create` permission

---

### 2.2 Workflow Tasks

#### 2.2.1 Get My Pending Tasks
*   **Endpoint**: `GET /api/v1/workflows/tasks`
*   **Access**: Authenticated users

#### 2.2.2 Get Task Counts for Dashboard
*   **Endpoint**: `GET /api/v1/workflows/tasks/counts`
*   **Access**: Authenticated users

#### 2.2.3 Get Task Details by ID
*   **Endpoint**: `GET /api/v1/workflows/tasks/:id`
*   **Access**: Authenticated users

#### 2.2.4 Delegate Task (Commented Out in Router)
*   **Endpoint**: `POST /api/v1/workflows/tasks/:id/delegate`
*   **Access**: Task assignee

#### 2.2.5 Claim Task (Commented Out in Router)
*   **Endpoint**: `POST /api/v1/workflows/tasks/:id/claim`
*   **Access**: Role member

#### 2.2.6 Release Task (Commented Out in Router)
*   **Endpoint**: `POST /api/v1/workflows/tasks/:id/release`
*   **Access**: Current task claimer

---

### 2.3 Workflow Instances

#### 2.3.1 Start Workflow Instance
*   **Endpoint**: `POST /api/v1/workflows/instances`
*   **Access**: Authenticated users
*   **Request Body**:
    ```json
    {
      "workflow_code": "standard_doc_approval",
      "entity_type": "document",
      "entity_id": "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
      "entity_name": "SOP-001 Quality Policy"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "7f8g9h0i-1j2k-3l4m-5n6o-7p8q9r0s1t2u",
        "status": "active",
        "current_step_id": "9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d"
      }
    }
    ```

#### 2.3.2 List Workflow Instances
*   **Endpoint**: `GET /api/v1/workflows/instances`
*   **Access**: Requires `workflow:read` permission

#### 2.3.3 Get Workflow Instance Details by ID
*   **Endpoint**: `GET /api/v1/workflows/instances/:id`
*   **Access**: Authenticated users

#### 2.3.4 Get Workflow Instance History
*   **Endpoint**: `GET /api/v1/workflows/instances/:id/history`
*   **Access**: Authenticated users

#### 2.3.5 Get Available Actions for Instance
*   **Endpoint**: `GET /api/v1/workflows/instances/:id/actions`
*   **Access**: Authenticated users

#### 2.3.6 Transition Workflow Instance
*   **Endpoint**: `POST /api/v1/workflows/instances/:id/transition`
*   **Access**: Assigned task user
*   **Request Body**:
    ```json
    {
      "task_id": "b0c1d2e3-f4a5-6b7c-8d9e-0f1a2b3c4d5e",
      "action": "approve",
      "comments": "Reviewed SOP. Compliance guidelines verified.",
      "password": "Password123!",
      "pin": "1234"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "instance_id": "7f8g9h0i-1j2k-3l4m-5n6o-7p8q9r0s1t2u",
        "action": "approve",
        "new_step": "approved"
      }
    }
    ```

#### 2.3.7 Cancel Workflow Instance
*   **Endpoint**: `POST /api/v1/workflows/instances/:id/cancel`
*   **Access**: Workflow admin or instance originator
*   **Request Body**:
    ```json
    {
      "reason": "Document template was deprecated."
    }
    ```
