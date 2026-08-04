# QAssure Platform — Application Database ER Diagrams Index

This folder contains service-wise database Entity-Relationship (ER) diagrams represented in Mermaid syntax, mapped directly from the PostgreSQL migration schemas.

### Service-Wise ER Diagrams

1.  [Identity Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/identity_service.md)
    *   *Handles*: Tenants, Users, Memberships, Roles, Permissions, User Roles, API Keys, Sessions, Audit Logs, Departments, and Designations.
2.  [QMS Integration Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/qms_integration_service.md)
    *   *Handles*: External QMS Connection settings, Dynamic Translation field Mappings, Sync history, and Conflict resolution ledgers.
3.  [Document Vault Service (AiDV)](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/document_vault_service.md)
    *   *Handles*: Controlled SOP Documents, Versions histories, Access Audits, concurrent checkout locks, Training policies, Document relations, and templates.
4.  [CAPA Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/capa_service.md)
    *   *Handles*: Corrective/Preventive Action plans, Actions items tasks, related issues linkings, 8D structured methodology reports, and period KPIs.
5.  [Supplier Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/supplier_service.md)
    *   *Handles*: Suppliers profiles, emergency contacts, scheduling audits, Findings lists, scorecards grading, files, and Approved Supplier lists (ASL).
6.  [Workflow State Engine](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/workflow_engine_service.md)
    *   *Handles*: State machines templates steps and transitions, SLA triggers, active instances runs, delegated actions, and tasks logs.
7.  [Security & FDA Compliance](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/security_compliance_service.md)
    *   *Handles*: FDA 21 CFR Part 11 compliant electronic signatures, PIN verification, Password history controls, and periodic access certification review campaigns.
8.  [Project Management Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/project_management_service.md)
    *   *Handles*: Projects portfolios, milestones gates tracking, enabled modules, project task dependencies, and action logs.
9.  [Billing, Licensing & Notifications](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/billing_notifications_service.md)
    *   *Handles*: Subscription pricing limits, billing invoices/payment tracking, user notification preferences, templates rendering, and event webhooks deliveries.
10. [AI Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/ai_service.md)
    *   *Handles*: AI completions logs, cost tracking, token count metrics, use-case configurations, and prompt templates.
11. [Electronic Signature Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/electronic_signature_service.md)
    *   *Handles*: FDA 21 CFR Part 11 electronic signature logs, signing meanings, IP address/user agent validations, and cryptographic hashes.
12. [Training Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/training_service.md)
    *   *Handles*: Curricula lists, courses details, quiz question libraries, exam attempts, certifications records, and competencies matrices.
13. [Knowledge Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/knowledge_service.md)
    *   *Handles*: Knowledge collections, document files ingestion statuses, metadata options, and user query search history logs.
14. [File Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/file_service.md)
    *   *Handles*: Centralized registry for local and cloud files attachments, file access logs, temporary shared links, and storage quotas.
15. [Notification Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/notification_service.md)
    *   *Handles*: Alert logs, preferences, template rendering, escalation rules, scheduling digests, and trigger conditions.
16. [Report Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/report_service.md)
    *   *Handles*: Report definitions, scheduled configurations, execution history logs, KPIs dashboards widgets, and custom preferences.
17. [Prompt Management Service](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/docs/Application_Database/prompt_management_service.md)
    *   *Handles*: Prompt templates version histories, evaluation test cases, input variables, and benchmark test results.

