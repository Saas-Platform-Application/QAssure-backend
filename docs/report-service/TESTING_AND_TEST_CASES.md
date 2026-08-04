# QAssure Reporting & Analytics Service — Testing & Test Cases

---

## 1. Test Strategy Overview

Testing the Reporting & Analytics Service focuses on:
1.  **Data Accuracy**: Verifying that compliance metrics, KPIs, and trend values match actual database rows.
2.  **Multi-Tenant Security**: Validating that endpoints scope queries to the active tenant ID and block cross-tenant file access.
3.  **Search Resiliency**: Validating Elasticsearch integrations and the PostgreSQL fallback mechanism.
4.  **Scheduled Executions & Exports**: Verifying schedule creation, cron job runs, PDF/Excel generation, and storage isolation.

---

## 2. Test Case Matrix

| ID | Module | Target Case Description | Input Data / Params | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **REP-TC-01** | Dashboard | Get Executive Dashboard | Auth token, Tenant ID | Dashboard object with CAPA, training, document, and supplier metrics, plus health score. |
| **REP-TC-02** | KPIs | Fetch Active KPIs list | Auth token | Array of active KPIs with current calculated values, target thresholds, and status. |
| **REP-TC-03** | Trends | Fetch Trends (monthly) | period: "monthly", months: 6 | Array of monthly segments showing opened/closed CAPAs and training counts. |
| **REP-TC-04** | Reports | Fetch list of active reports | Auth token | List of system and public report definitions. |
| **REP-TC-05** | Reports | Execute Report by ID | Report UUID, params | Executed report rows; inserts log into `report_history`. |
| **REP-TC-06** | Search | Global Search (ES connected) | q: "SOP" | List of results from documents, CAPAs, suppliers, and training with highlights. |
| **REP-TC-07** | Search | Global Search (ES offline fallback) | q: "SOP" | Caught error, parallel SQL search using `ILIKE` on PostgreSQL, returns matches. |
| **REP-TC-08** | Schedules | Create Scheduled Report | report_definition_id, schedule_type, config, recipients | Config created (201 Created); calculates and saves `next_run_at`. |
| **REP-TC-09** | Schedules | Run Scheduled Report Now | Scheduled Report UUID | Executes query, writes export file, logs to history, updates last/next run times. |
| **REP-TC-10** | Exports | Export Report to PDF | Report UUID | Compiles PDFKit file; streams file back to client (PDF Content-Type). |
| **REP-TC-11** | Exports | Export Report to Excel | Report UUID | Compiles ExcelJS sheet; streams file back (spreadsheet Content-Type). |
| **REP-TC-12** | Exports | List Tenant Exports | Auth token | List of files in `exports/{tenant_id}/` and legacy root exports. |
| **REP-TC-13** | Exports | Download Export File | filename | Downloads file; verifies file ownership and scopes path to authenticated tenant folder. |
| **REP-TC-14** | Exports | Delete Export File | filename | Deletes file from disk; updates database `report_history` output path to `NULL`. |
| **REP-TC-15** | Exports | Cleanup Old Exports (Admin) | max_age_days: 15 | Deletes files older than 15 days; clears outdated database references. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Scheduled Report Lifecycle and File Delivery
1.  **Action**: Create a monthly scheduled report configuration for report definition `capa_summary`.
    *   *Check*: Verify the schedule is created, status is active, and `next_run_at` is set to the first day of the next month.
2.  **Action**: Update the database record of the schedule, setting `next_run_at` to a time in the past.
3.  **Action**: Manually execute `ScheduledReportsService.processScheduledReports()`.
    *   *Check*: Check server logs to verify processing. Confirm a PDF file is created in `exports/{tenant_id}/`.
4.  **Action**: Fetch the list of exports using `GET /api/v1/reporting/exports`.
    *   *Check*: Verify the newly generated file is in the list with `isolated: true` and the correct size.
5.  **Action**: Download the file using `GET /api/v1/reporting/exports/download/{filename}`.
    *   *Check*: Verify the file headers and contents are correct.
6.  **Action**: Delete the file using `DELETE /api/v1/reporting/exports/{filename}`.
    *   *Check*: Verify the file is deleted from disk and the `report_history` output path is cleared.

### Scenario B: Cross-Tenant File Access Gating
1.  **Action**: Authenticate as Tenant A (User A) and download an export file named `tenant_a_report.pdf`. Record the filename.
2.  **Action**: Authenticate as Tenant B (User B).
3.  **Action**: Attempt to download the file using `GET /api/v1/reporting/exports/download/tenant_a_report.pdf`.
    *   *Check*: Verify the server returns a `404 Not Found` or `403 Forbidden` error, blocking cross-tenant access.
