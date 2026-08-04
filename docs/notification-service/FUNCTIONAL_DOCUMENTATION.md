# Notification Service Functional Documentation

The Notification Service acts as the communication core of QAssure, enabling users and system administrators to stay informed about regulatory actions, task assignments, and overdue warnings.

---

## 1. Key Functional Features

### 1.1 In-App Real-Time Alerts
- **Badge Indicators**: Whenever a new notification is generated, an instant event is sent via WebSockets to update the user's unread notification badge count.
- **Persistent Inbox**: Notifications are committed to the `notifications` table so they persist across sessions. Users can mark notifications as read or dismiss them (hiding them from the active list).

### 1.2 Multi-Channel Delivery Options
- **Channels Supported**: In-App push notifications and Email.
- **Preference Controls**: Users have absolute authority over their channels. For each category (e.g. `CAPA`, `Supplier`, `Training`), users can toggle `in_app` and `email` channels on or off.

### 1.3 Timezone-Aware Quiet Hours
- To prevent regulatory alerts or task reminders from interrupting users outside of working hours, users can enable a **Quiet Hours** period.
- **Delivery Policy**: 
  - If quiet hours are active, any triggered email notifications are cached and held back. They are released only after the quiet hours window expires.
  - In-app alerts are still saved and pushed to WebSockets, but the client application can silence visual toasts or audio rings during this window.

### 1.4 Tenant Template Customization
- **Global Defaults**: Super Admins define default system-wide templates with generic wording.
- **Tenant Overrides**: Tenant administrators can modify template subject lines, headers, and bodies (both in-app text and HTML email bodies) to adhere to their organization's corporate communication policies.
- **Reversion**: Tenant overrides can be deleted to instantly revert back to system-wide defaults.

---

## 2. Escalation & Overdue Alert Engine

The platform automatically scans critical entities for target deadlines:
- **CAPA Target Dates**: If a CAPA target date is breached, the escalation rules process warning alerts.
- **Training Milestones**: Alerts Trainees when courses approach due dates, and escalates to managers/instructors when deadlines are missed.
- **Workflow Step SLAs**: Warns step assignees when a task's SLA is close to expiring, and reassigns or alerts managers upon breach.

### Anti-Spam Control
To avoid overwhelming users with daily warning scripts, the service logs processed actions to `escalation_history`. The system limits notifications to a maximum of one escalation dispatch per entity within any 24-hour window.
