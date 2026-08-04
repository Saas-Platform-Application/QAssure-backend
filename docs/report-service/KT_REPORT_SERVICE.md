# QAssure Reporting & Analytics Service

## Technical Knowledge Transfer (KT) Guide

Welcome to the technical Knowledge Transfer (KT) guide for the **Reporting & Analytics Service** of the QAssure Platform. This document outlines the service's architecture, routes, database schemas, validation layers, execution engine, scheduled cron tasks, and integrations (e.g. Elasticsearch search engine and PDF/Excel export modules).

---

## 1. Architectural Overview

The Reporting & Analytics Service provides unified compliance insights, key performance indicators (KPIs), trends, file exports, and global search functionality across the QAssure platform.

### Directory & Component Map

- **Routing Layer**: [reporting.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/reporting.routes.js) defines Express endpoints, assigns authorization requirements (`authorize`), and sets up file streaming routes.
- **Controller Layer**:
  - [reporting.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/reporting.controller.js) handles dashboards, KPIs, trends, search, and audit log requests.
  - [scheduled-reports.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/scheduled-reports.controller.js) handles scheduled configuration updates, manual triggers, and file download/deletion exports.
- **Service Layer**:
  - [reporting.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/reporting.service.js) aggregates PostgreSQL database counts for dashboards and trends, processes report definitions, and handles Postgres search fallbacks.
  - [scheduled-reports.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/scheduled-reports.service.js) sets up cron intervals for scheduled runs, logs execution histories, and calculates next scheduled run times.
  - [export.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/export.service.js) formats data into PDFKit documents and ExcelJS worksheets, enforces isolated directory boundaries on disk, and runs TTL-based file purges.
- **Infrastructure Layer**:
  - [elasticsearch.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/infrastructure/search/elasticsearch.service.js) coordinates Elasticsearch connections, indexes document changes, and executes multi-match queries.

---

## 2. System Interaction Workflows

### A. Report Execution & Export Workflow
This sequence details how a report is executed and exported on-demand as a file download.

```mermaid
sequenceDiagram
    autonumber
    actor User as Quality Manager
    participant Ctrl as scheduled-reports.controller
    participant RepSvc as reporting.service
    participant ExpSvc as export.service
    database DB as PostgreSQL DB
    
    User->>Ctrl: POST /api/v1/reporting/reports/:id/export/pdf (params)
    Ctrl->>RepSvc: executeReport(id, tenantId, params, executedBy)
    Note over RepSvc: Resolves report code (e.g. capa_summary)
    RepSvc->>DB: Query CAPA table
    DB-->>RepSvc: Raw SQL rows
    RepSvc->>DB: INSERT INTO report_history (status = 'completed')
    RepSvc-->>Ctrl: Compiled report data JSON
    
    Ctrl->>ExpSvc: exportAndTrack(reportData, 'pdf', tenantId, metadata)
    Note over ExpSvc: Compiles PDF via PDFKit
    ExpSvc->>ExpSvc: Write file to exports/[tenant_id]/[file_name].pdf
    ExpSvc->>DB: UPDATE report_history SET output_path, file_size
    ExpSvc-->>Ctrl: Resolved file path details
    Ctrl-->>User: File download stream (.pdf)
```

---

### B. Automated Scheduled Report Cron Cycle
This sequence details the hourly cron checker processing due scheduled reports in the background.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as node-cron scheduler
    participant SchedSvc as scheduled-reports.service
    participant RepSvc as reporting.service
    participant ExpSvc as export.service
    database DB as PostgreSQL DB

    Cron->>SchedSvc: Trigger check every hour ('0 * * * *')
    SchedSvc->>DB: Query scheduled_reports where next_run_at <= NOW()
    DB-->>SchedSvc: Due schedules list
    
    loop for each due schedule
        SchedSvc->>RepSvc: executeReport(report_id, tenant_id, ...)
        RepSvc->>DB: Execute query
        DB-->>RepSvc: Report rows
        RepSvc-->>SchedSvc: Report data
        
        SchedSvc->>ExpSvc: exportAndTrack(reportData, format, tenant_id, metadata)
        ExpSvc->>ExpSvc: Write file to exports/[tenant_id]/
        ExpSvc->>DB: INSERT INTO report_history (output_path, status = 'completed')
        ExpSvc-->>SchedSvc: Export file details
        
        Note over SchedSvc: Computes future next_run_at
        SchedSvc->>DB: UPDATE scheduled_reports SET last_run_at = NOW(), next_run_at = nextRun
    end
```

---

### C. Federated Global Search Workflow
This sequence details how a search query runs through Elasticsearch with a database fallback.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Search
    participant Ctrl as reporting.controller
    participant RepSvc as reporting.service
    participant ES as elasticsearch.service
    database DB as PostgreSQL DB

    User->>Ctrl: GET /api/v1/reporting/search?q=SOP
    Ctrl->>RepSvc: globalSearch(q, tenantId, options)
    RepSvc->>ES: Check connection health
    
    alt ES is Connected
        RepSvc->>ES: globalSearch(q, tenantId, options)
        ES-->>RepSvc: Search hits with highlights
        alt Hits Found > 0
            RepSvc-->>Ctrl: Return Elasticsearch results
        else Hits Found == 0 (Fallback)
            Note over RepSvc: Index out of sync, fallback to DB
            RepSvc->>DB: Run parallel ILIKE queries on CAPAs, Docs, Suppliers, Courses
            DB-->>RepSvc: SQL rows
            RepSvc-->>Ctrl: Return database results
        end
    else ES is Disconnected
        Note over RepSvc: Outage detected, fallback to DB
        RepSvc->>DB: Run parallel ILIKE queries on CAPAs, Docs, Suppliers, Courses
        DB-->>RepSvc: SQL rows
        RepSvc-->>Ctrl: Return database results
    end
    
    Ctrl-->>User: Search Results JSON
```

---

## 3. Key Implementation Details

### A. Health Score Calculation
Calculated inside `reporting.service.js`. Every tenant starts with a perfect score of 100, which is reduced as follows:
- Open CAPAs: `-5` per overdue CAPA, `-3` per critical CAPA.
- Training Compliance: `-1` for every percentage point below `95%`.
- Document Control: `-2` per overdue effective document.
- Suppliers: `-3` per suspended supplier.

### B. Node-Cron Schedules
Initialized inside `scheduled-reports.service.js` under `start()`:
- `0 * * * *` (hourly): Processes pending scheduled reports.
- `0 6 * * *` (daily at 6 AM): Runs daily schedules.
- `0 6 * * 1` (weekly on Monday at 6 AM): Runs weekly schedules.
- `0 6 1 * *` (monthly on 1st at 6 AM): Runs monthly schedules.
- `0 0 * * *` (daily at midnight): Runs cleanup removing export files older than 30 days.

---

## 4. Developer KT Cheat Sheet: Common Tasks

### A. How to Add a New Report Type?
1. Register a code string for the new report (e.g. `training_assignments_detail`) in the `report_definitions` database table.
2. Open `src/services/reporting.service.js`. Under `executeReport()`, add a new case:
   ```javascript
   case 'training_assignments_detail':
     data = await this._getTrainingAssignmentsDetail(tenantId);
     break;
   ```
3. Implement the query helper method `_getTrainingAssignmentsDetail(tenantId)` inside the service file:
   ```javascript
   async _getTrainingAssignmentsDetail(tenantId) {
     const result = await this.pool.query(
       `SELECT ta.id, ta.status, u.email, tc.title as course 
        FROM training_assignments ta
        JOIN users u ON ta.user_id = u.id
        JOIN training_courses tc ON ta.course_id = tc.id
        WHERE ta.tenant_id = $1`,
       [tenantId]
     );
     return result.rows;
   }
   ```

### B. How to Define a New KPI?
1. Insert a new KPI metadata row inside the `kpi_definitions` table, defining a code (e.g. `capa_critical_count`) and target rules.
2. Open `src/services/reporting.service.js` and edit `_calculateKPIValue()`:
   ```javascript
   case 'capa_critical_count':
     return (await this._getCapaMetrics(tenantId)).critical;
   ```

### C. How to Trigger a Manual Report Export from another service?
Import and invoke the `ExportService` directly to compile and track files:
```javascript
const { getExportService } = require('../services/export.service');
const { getReportingService } = require('../services/reporting.service');

const reporting = getReportingService();
const exportsManager = getExportService();

// 1. Fetch report datasets
const data = await reporting.executeReport(reportId, tenantId, {}, userId);

// 2. Compile and save PDF, logging details to report_history
const result = await exportsManager.exportAndTrack(data, 'pdf', tenantId, {
  reportDefinitionId: reportId,
  executedBy: userId,
  reportName: 'Manual Export SOP Audit'
});

console.log('File compiled at:', result.filePath);
```
