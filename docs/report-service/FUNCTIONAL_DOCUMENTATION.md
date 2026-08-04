# QAssure Reporting & Analytics Service — Functional Documentation

---

## 1. Functional Scope

The **Reporting & Analytics Service** represents the centralized intelligence layer of the QAssure platform. It is responsible for compiling data from across all core business modules (CAPAs, Document Control, Training Management, and Supplier Management) and presenting it in actionable formats. 

The service supports two modes of interaction:
1. **Interactive Analytics**: Real-time dashboards, custom queries, KPI tracking, and search operations.
2. **Automated Auditing & Delivery**: Scheduled report generation, GxP-compliant PDF/Excel formatting, and security-isolated file management.

---

## 2. Key Modules & Features

### 2.1 Executive Dashboard & Compliance Health Score
The executive dashboard gives a high-level overview of the tenant's compliance status. At the heart of the dashboard is the **Compliance Health Score**, which starts at 100% and decreases based on specific compliance metrics:

*   **CAPA Breaches**: Deducts **5 points** for each overdue open CAPA and **3 points** for each critical open CAPA.
*   **Training Compliance**: Deducts **1 point** for each percentage point that the training compliance rate drops below a **95% baseline** (e.g. 90% compliance results in a 5-point deduction).
*   **Document Review Delays**: Deducts **2 points** for each effective document that is past its next review date.
*   **Supplier Suspensions**: Deducts **3 points** for each suspended supplier.
*   **Score Bounds**: The final score is rounded to the nearest integer and constrained strictly between **0%** and **100%**.

### 2.2 Key Performance Indicators (KPIs)
The service automatically evaluates 10 pre-defined compliance metrics:

| KPI Code | Name | Target Direction | Description |
| :--- | :--- | :--- | :--- |
| `capa_open_count` | Open CAPAs | Lower is Better | Total open corrective/preventive actions. |
| `capa_overdue_count` | Overdue CAPAs | Lower is Better | Open CAPAs where target date is in the past. |
| `capa_ontime_rate` | CAPA On-time Rate | Higher is Better | Percentage of open CAPAs that are on schedule. |
| `training_compliance` | Training Compliance | Higher is Better | Percentage of assigned training tasks completed. |
| `training_overdue` | Overdue Trainings | Lower is Better | Training tasks past due date. |
| `docs_due_review` | Documents Due Review | Lower is Better | Effective documents past next review date. |
| `docs_currency_rate` | Document Currency Rate | Higher is Better | Percentage of effective docs with current reviews. |
| `supplier_approved` | Approved Suppliers | Higher is Better | Total number of approved suppliers in list. |
| `supplier_avg_score` | Average Supplier Score | Higher is Better | Average performance evaluation score. |
| `supplier_expiring` | Expiring Suppliers | Lower is Better | Suppliers with certificates expiring in 30 days. |

KPI statuses are computed dynamically:
*   **On Target**: The metric meets or exceeds the target value.
*   **Warning**: The metric falls short of the target value.
*   **Neutral**: No target value is defined for the metric.

---

### 2.3 Scheduled Reports Lifecycle
Scheduled reports automate auditing operations by generating periodic snapshots:

*   **Schedules**: Supports `daily` (run every day at 6 AM), `weekly` (run every Monday at 6 AM), `monthly` (run on the 1st of the month at 6 AM), and `quarterly` (run on the first day of the quarter at 6 AM).
*   **Next Run Calculation**: On creation or update, the scheduler calculates `next_run_at` based on the timing configuration.
*   **Generation**: The scheduled worker queries the database, executes the report queries, builds files using the `ExportService`, saves the files in isolated directories, and schedules the next run.
*   **Recipients**: The task records an audit trail of recipient details. Failed executions write the error details to `report_history`.

---

### 2.4 Hybrid Search Engine
Search queries run through a hybrid routing logic:

*   **Full-Text Elasticsearch**: Searches across indices containing lowercase, fuzzy tokens of title, code, and text content. Hits return highlighted matching keywords wrapped in HTML `<mark>` tags.
*   **Relational Database Fallback**: If the search service is disconnected or returns zero results, the service executes SQL queries using `ILIKE` across:
    *   `capas` (matching title and CAPA number)
    *   `documents` (matching title and document number)
    *   `suppliers` (matching name and supplier code)
    *   `training_courses` (matching title and course code)

---

### 2.5 Export Compilers
The export system formats datasets into structured files:

*   **PDF Compiler (PDFKit)**: Builds documents with title pages, audit timestamps, footer page numbers (`Page X of Y`), and custom-designed sections:
    *   *Dashboard Template*: Renders key metrics sorted into modules, showing health scores and indented key-value rows.
    *   *Table Template*: Displays tabular data inside grid structures, rendering the top 50 rows with alternating row background colors and truncating remaining records to keep file sizes optimal.
*   **Excel Compiler (ExcelJS)**: Creates worksheets containing structured cells:
    *   *Summary/Dashboard sheet*: Formatted rows showing metrics with bold titles.
    *   *Module sheets*: Multi-sheet workbooks separating CAPAs, training, documents, and suppliers into dedicated tab segments with auto-filters enabled on column headers.
    *   *Metadata sheet*: Logs export names, generation timestamps, and tenant IDs.

---

## 3. FDA 21 CFR Part 11 Compliance Standards

In GxP software architectures, reports are critical documents of record. The Reporting Service ensures compliance via:

1.  **Immutable History Log**: Every manual or scheduled report execution writes a permanent entry to `report_history`, capturing execution duration, row counts, user IDs, and file metadata.
2.  **File Size & Hash Consistency**: The server saves file sizes and paths directly to the history table. Modifying the generated files on disk will break database consistency checks, preventing file tampering.
3.  **Strict Retention & Automatic Purge**: The daily cron job automatically purges export files older than 30 days and clears their `output_path` references in the database, ensuring clean storage and data lifecycle compliance.
