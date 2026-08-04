# QAssure Reporting & Analytics Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit testing ensures the service's internal utility methods, calculations, and validators work correctly in isolation:

1.  **Compliance Health Score Calculation**: Verifies that `ReportingService._calculateHealthScore()` calculates the correct score based on input metrics, applies deductions correctly, and bounds the score between 0% and 100%.
2.  **Next Run Calculations**: Verifies that `ScheduledReportsService._calculateNextRun()` calculates the correct timing for daily, weekly, monthly, and quarterly schedules based on configuration parameters.
3.  **Path and File Access Gating**: Verifies that `ExportService.getFilePath()` prevents path traversal attacks (e.g. filenames containing `../`) and returns the correct path.

---

## 2. Test Cases and Assertions

### 2.1 Compliance Health Score Math
*   **Target**: Ensure the score calculation logic is accurate and bounded.
*   **Test Cases**:
    *   *Perfect Score*: No issues across all modules should return `100`.
    *   *CAPA Deductions*: 2 overdue CAPAs and 1 critical CAPA should deduct `13 points` (10 + 3), returning `87`.
    *   *Training Deductions*: 85% compliance rate should deduct `10 points` (95 - 85), returning `90`.
    *   *Document Deductions*: 3 overdue documents should deduct `6 points` (3 * 2), returning `94`.
    *   *Supplier Deductions*: 2 suspended suppliers should deduct `6 points` (2 * 3), returning `94`.
    *   *Lower Bound*: Extreme compliance issues should return `0` instead of a negative score.

### 2.2 Next Run Scheduler Timing
*   **Target**: Validate scheduled timing intervals.
*   **Test Cases**:
    *   *Daily*: Configured for 8 AM should return tomorrow's date at 8:00 AM.
    *   *Weekly*: Configured for Tuesday (day 2) at 6 AM should return the next Tuesday at 6:00 AM.
    *   *Monthly*: Configured for day 15 at 8 AM should return the 15th day of the next month at 8:00 AM.

---

## 3. Mock Test Stub Implementation

Below are unit tests written using Jest, demonstrating how to mock database pools and test calculations:

```javascript
const { ReportingService } = require('../../src/services/reporting.service');
const { ScheduledReportsService } = require('../../src/services/scheduled-reports.service');

describe('Reporting Service - Compliance Health Score', () => {
  let reportingService;

  beforeEach(() => {
    reportingService = new ReportingService();
  });

  it('should return 100 for a perfect compliance state', () => {
    const perfectMetrics = {
      capa: { overdue: 0, critical: 0 },
      training: { compliance_rate: 98 }, // Above 95% threshold
      documents: { review_overdue: 0 },
      suppliers: { suspended: 0 }
    };
    const score = reportingService._calculateHealthScore(perfectMetrics);
    expect(score).toBe(100);
  });

  it('should apply deductions for overdue and critical CAPAs', () => {
    const metrics = {
      capa: { overdue: 2, critical: 1 }, // 2*5 + 1*3 = 13 deduction
      training: { compliance_rate: 96 },
      documents: { review_overdue: 0 },
      suppliers: { suspended: 0 }
    };
    const score = reportingService._calculateHealthScore(metrics);
    expect(score).toBe(87);
  });

  it('should deduct points for training compliance below 95%', () => {
    const metrics = {
      capa: { overdue: 0, critical: 0 },
      training: { compliance_rate: 85 }, // 95 - 85 = 10 deduction
      documents: { review_overdue: 0 },
      suppliers: { suspended: 0 }
    };
    const score = reportingService._calculateHealthScore(metrics);
    expect(score).toBe(90);
  });

  it('should bound the score to a minimum of 0', () => {
    const metrics = {
      capa: { overdue: 25, critical: 10 }, // Extreme deductions
      training: { compliance_rate: 20 },
      documents: { review_overdue: 10 },
      suppliers: { suspended: 5 }
    };
    const score = reportingService._calculateHealthScore(metrics);
    expect(score).toBe(0);
  });
});

describe('Scheduled Reports - Next Run Calculation', () => {
  let scheduledService;

  beforeEach(() => {
    scheduledService = new ScheduledReportsService();
  });

  it('should calculate the next run for a daily schedule', () => {
    const config = { hour: 8, minute: 30 };
    const nextRun = scheduledService._calculateNextRun('daily', config);
    
    const expected = new Date();
    expected.setDate(expected.getDate() + 1);
    expected.setHours(8, 30, 0, 0);

    expect(nextRun.getDate()).toBe(expected.getDate());
    expect(nextRun.getHours()).toBe(8);
    expect(nextRun.getMinutes()).toBe(30);
  });
});
```
