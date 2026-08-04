/**
 * Export Service
 * Handles PDF and Excel export generation for reports
 * 
 * Features:
 * - Tenant-isolated export directories (exports/{tenant_id}/)
 * - Database tracking via report_history.output_path
 * - TTL-based cleanup of old export files
 * - Secure download with tenant ownership validation
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { pool } = require('../config/database');
const { formatDateTime } = require('../utils/dateFormatter');

class ExportService {
  constructor() {
    this.baseOutputDir = config.upload.exportDir || path.join(process.cwd(), 'exports');
    this._ensureDir(this.baseOutputDir);
  }

  _ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get tenant-specific export directory
   * Creates exports/{tenant_id}/ if it doesn't exist
   */
  _getTenantDir(tenantId) {
    const tenantDir = path.join(this.baseOutputDir, tenantId);
    this._ensureDir(tenantDir);
    return tenantDir;
  }

  // ============================================================================
  // PDF EXPORT
  // ============================================================================

  async exportToPDF(reportData, filename, tenantId = null) {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const safeFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const outputFilename = `${safeFilename}_${timestamp}.pdf`;
      
      // Tenant-isolated directory if tenantId provided, else legacy flat dir
      const outputDir = tenantId ? this._getTenantDir(tenantId) : this.baseOutputDir;
      const filePath = path.join(outputDir, outputFilename);
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .text('QAssure Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica')
         .text(reportData.report || filename, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666666')
         .text(`Generated: ${formatDateTime(reportData.generated_at || Date.now())}`, { align: 'center' });
      
      doc.moveDown(1);
      doc.strokeColor('#cccccc').lineWidth(1)
         .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Content
      doc.fillColor('#000000');
      const data = reportData.data;

      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          this._renderPDFTable(doc, data);
        } else if (data.capa || data.training || data.documents || data.suppliers) {
          this._renderPDFDashboard(doc, data);
        } else if (data.period && data.data) {
          this._renderPDFTrends(doc, data);
        } else {
          this._renderPDFObject(doc, data);
        }
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#999999')
           .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 50, { align: 'center' });
      }

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  _renderPDFDashboard(doc, data) {
    const sections = [
      { title: 'CAPA Metrics', data: data.capa },
      { title: 'Training Metrics', data: data.training },
      { title: 'Document Metrics', data: data.documents },
      { title: 'Supplier Metrics', data: data.suppliers }
    ];

    if (data.health_score !== undefined) {
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
         .text(`Overall Health Score: ${data.health_score}%`, { align: 'center' });
      doc.moveDown(1);
    }

    for (const section of sections) {
      if (!section.data) continue;
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937')
         .text(section.title);
      doc.moveDown(0.3);

      doc.fontSize(10).font('Helvetica').fillColor('#374151');
      for (const [key, value] of Object.entries(section.data)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.text(`${label}: ${value}`, { indent: 20 });
      }
      doc.moveDown(0.8);
    }
  }

  _renderPDFTable(doc, data) {
    if (data.length === 0) {
      doc.fontSize(10).text('No data available');
      return;
    }

    const headers = Object.keys(data[0]);
    const colWidth = (495 / Math.min(headers.length, 5));
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    let x = 50;
    const headerY = doc.y;
    
    doc.rect(50, headerY - 5, 495, 20).fill('#374151');
    doc.fillColor('#ffffff');
    
    headers.slice(0, 5).forEach((header, i) => {
      const label = header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      doc.text(label.substring(0, 15), x + 5, headerY, { width: colWidth - 10, continued: false });
      x += colWidth;
    });

    doc.moveDown(0.8);

    doc.font('Helvetica').fontSize(8).fillColor('#374151');
    
    data.slice(0, 50).forEach((row, rowIndex) => {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }

      x = 50;
      const rowY = doc.y;
      
      if (rowIndex % 2 === 0) {
        doc.rect(50, rowY - 3, 495, 15).fill('#f9fafb');
        doc.fillColor('#374151');
      }

      headers.slice(0, 5).forEach((header) => {
        let value = row[header];
        if (value === null || value === undefined) value = '-';
        if (typeof value === 'object') value = JSON.stringify(value).substring(0, 20);
        doc.text(String(value).substring(0, 20), x + 5, rowY, { width: colWidth - 10 });
        x += colWidth;
      });
      
      doc.moveDown(0.6);
    });

    if (data.length > 50) {
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#6b7280')
         .text(`... and ${data.length - 50} more rows`);
    }
  }

  _renderPDFTrends(doc, data) {
    doc.fontSize(12).font('Helvetica-Bold')
       .text(`Trend Report (${data.period})`);
    doc.moveDown(0.5);
    this._renderPDFTable(doc, data.data);
  }

  _renderPDFObject(doc, data) {
    doc.fontSize(10).font('Helvetica');
    for (const [key, value] of Object.entries(data)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (typeof value === 'object' && value !== null) {
        doc.font('Helvetica-Bold').text(`${label}:`);
        doc.font('Helvetica').text(JSON.stringify(value, null, 2), { indent: 20 });
      } else {
        doc.text(`${label}: ${value}`);
      }
      doc.moveDown(0.3);
    }
  }

  // ============================================================================
  // EXCEL EXPORT
  // ============================================================================

  async exportToExcel(reportData, filename, tenantId = null) {
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const outputFilename = `${safeFilename}_${timestamp}.xlsx`;
    
    // Tenant-isolated directory if tenantId provided
    const outputDir = tenantId ? this._getTenantDir(tenantId) : this.baseOutputDir;
    const filePath = path.join(outputDir, outputFilename);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QAssure';
    workbook.created = new Date();

    const data = reportData.data;

    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        this._createDataSheet(workbook, 'Report Data', data);
      } else if (data.capa || data.training || data.documents || data.suppliers) {
        this._createDashboardSheets(workbook, data);
      } else if (data.period && data.data) {
        this._createDataSheet(workbook, 'Trends', data.data);
      } else {
        this._createSummarySheet(workbook, 'Summary', data);
      }
    }

    // Metadata sheet
    const metaSheet = workbook.addWorksheet('Report Info');
    metaSheet.columns = [
      { header: 'Property', key: 'property', width: 20 },
      { header: 'Value', key: 'value', width: 40 }
    ];
    metaSheet.addRow({ property: 'Report Name', value: reportData.report || filename });
    metaSheet.addRow({ property: 'Generated At', value: reportData.generated_at || new Date().toISOString() });
    metaSheet.addRow({ property: 'Generated By', value: 'QAssure Platform' });
    if (tenantId) {
      metaSheet.addRow({ property: 'Tenant ID', value: tenantId });
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  _createDataSheet(workbook, sheetName, data) {
    if (!data || data.length === 0) return;

    const sheet = workbook.addWorksheet(sheetName);
    const headers = Object.keys(data[0]);

    sheet.columns = headers.map(header => ({
      header: header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      key: header,
      width: Math.max(15, header.length + 5)
    }));

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF374151' }
    };

    data.forEach((row, index) => {
      const values = {};
      headers.forEach(h => {
        let val = row[h];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        values[h] = val;
      });
      sheet.addRow(values);

      if (index % 2 === 0) {
        sheet.getRow(index + 2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        };
      }
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    };
  }

  _createDashboardSheets(workbook, data) {
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 15 }
    ];
    
    summarySheet.getRow(1).font = { bold: true };

    if (data.health_score !== undefined) {
      summarySheet.addRow({ metric: 'Overall Health Score', value: `${data.health_score}%` });
      summarySheet.addRow({ metric: '', value: '' });
    }

    const sections = ['capa', 'training', 'documents', 'suppliers'];
    for (const section of sections) {
      if (!data[section]) continue;
      
      summarySheet.addRow({ metric: section.toUpperCase() + ' METRICS', value: '' });
      summarySheet.getRow(summarySheet.rowCount).font = { bold: true };
      
      for (const [key, value] of Object.entries(data[section])) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        summarySheet.addRow({ metric: '  ' + label, value: value });
      }
      summarySheet.addRow({ metric: '', value: '' });
    }

    for (const section of sections) {
      if (!data[section]) continue;
      
      const sheet = workbook.addWorksheet(section.charAt(0).toUpperCase() + section.slice(1));
      sheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];
      
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };

      for (const [key, value] of Object.entries(data[section])) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        sheet.addRow({ metric: label, value: value });
      }
    }
  }

  _createSummarySheet(workbook, sheetName, data) {
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: 'Property', key: 'property', width: 30 },
      { header: 'Value', key: 'value', width: 50 }
    ];

    sheet.getRow(1).font = { bold: true };

    for (const [key, value] of Object.entries(data)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let displayValue = value;
      if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value);
      }
      sheet.addRow({ property: label, value: displayValue });
    }
  }

  // ============================================================================
  // DB-TRACKED EXPORT (used by scheduled reports & on-demand exports)
  // ============================================================================

  /**
   * Export report and track in report_history
   * @param {object} reportData - Report execution result
   * @param {string} format - 'pdf' or 'excel'
   * @param {string} tenantId - Tenant UUID
   * @param {object} metadata - { reportDefinitionId, scheduledReportId, executedBy, reportName }
   * @returns {object} { filePath, historyId, filename }
   */
  async exportAndTrack(reportData, format, tenantId, metadata = {}) {
    const startTime = Date.now();
    const reportName = metadata.reportName || reportData.report || 'report';
    
    let filePath;
    if (format === 'excel' || format === 'xlsx') {
      filePath = await this.exportToExcel(reportData, reportName, tenantId);
    } else {
      filePath = await this.exportToPDF(reportData, reportName, tenantId);
    }

    const filename = path.basename(filePath);
    // Store relative path: {tenant_id}/{filename}
    const relativePath = tenantId ? `${tenantId}/${filename}` : filename;
    const fileStats = fs.statSync(filePath);

    // Log to report_history with output_path
    const historyResult = await pool.query(
      `INSERT INTO report_history (
        tenant_id, report_definition_id, scheduled_report_id, report_name,
        executed_by, status, execution_time_ms, row_count, output_path, output_format, file_size_bytes
      ) VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        tenantId,
        metadata.reportDefinitionId || null,
        metadata.scheduledReportId || null,
        reportName,
        metadata.executedBy || null,
        Date.now() - startTime,
        Array.isArray(reportData.data) ? reportData.data.length : 1,
        relativePath,
        format === 'excel' || format === 'xlsx' ? 'xlsx' : 'pdf',
        fileStats.size
      ]
    );

    return {
      filePath,
      filename,
      relativePath,
      historyId: historyResult.rows[0].id,
      fileSize: fileStats.size
    };
  }

  // ============================================================================
  // TENANT-SCOPED FILE OPERATIONS
  // ============================================================================

  /**
   * Get file path with tenant ownership validation
   * @param {string} filename - File name
   * @param {string} tenantId - Tenant UUID for isolation
   * @returns {string|null} Full file path if exists and owned by tenant
   */
  getFilePath(filename, tenantId = null) {
    // Prevent path traversal
    const safeName = path.basename(filename);
    
    if (tenantId) {
      // Check tenant directory first (new structure)
      const tenantPath = path.join(this.baseOutputDir, tenantId, safeName);
      if (fs.existsSync(tenantPath)) return tenantPath;
    }
    
    // Fallback to flat directory (legacy files)
    const legacyPath = path.join(this.baseOutputDir, safeName);
    if (fs.existsSync(legacyPath)) return legacyPath;
    
    return null;
  }

  /**
   * List exports for a specific tenant
   * Includes both tenant-isolated files and legacy flat files
   * @param {string} tenantId - Tenant UUID
   * @returns {Array} List of export file info
   */
  listExports(tenantId = null) {
    const files = [];
    
    if (tenantId) {
      // Tenant-isolated directory
      const tenantDir = path.join(this.baseOutputDir, tenantId);
      if (fs.existsSync(tenantDir)) {
        const tenantFiles = fs.readdirSync(tenantDir)
          .filter(f => f.endsWith('.pdf') || f.endsWith('.xlsx'));
        
        for (const f of tenantFiles) {
          const stats = fs.statSync(path.join(tenantDir, f));
          files.push({
            filename: f,
            type: f.endsWith('.pdf') ? 'pdf' : 'excel',
            size_bytes: stats.size,
            created_at: stats.birthtime.toISOString(),
            path: `/api/v1/reporting/exports/download/${f}`,
            isolated: true
          });
        }
      }
    }
    
    // Also include legacy flat directory files (backward compatibility)
    // In production, you'd migrate these and remove this block
    const legacyFiles = fs.readdirSync(this.baseOutputDir)
      .filter(f => (f.endsWith('.pdf') || f.endsWith('.xlsx')) && !fs.statSync(path.join(this.baseOutputDir, f)).isDirectory());
    
    for (const f of legacyFiles) {
      // Avoid duplicates
      if (!files.find(existing => existing.filename === f)) {
        const stats = fs.statSync(path.join(this.baseOutputDir, f));
        files.push({
          filename: f,
          type: f.endsWith('.pdf') ? 'pdf' : 'excel',
          size_bytes: stats.size,
          created_at: stats.birthtime.toISOString(),
          path: `/api/v1/reporting/exports/download/${f}`,
          isolated: false  // Legacy file, not tenant-isolated
        });
      }
    }

    // Sort by created_at descending
    files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return files;
  }

  /**
   * Delete export file with tenant ownership check
   */
  async deleteExport(filename, tenantId = null) {
    const filePath = this.getFilePath(filename, tenantId);
    if (!filePath) return false;

    fs.unlinkSync(filePath);

    // Also clean up report_history reference
    if (tenantId) {
      await pool.query(
        `UPDATE report_history SET output_path = NULL 
         WHERE tenant_id = $1 AND output_path LIKE $2`,
        [tenantId, `%${path.basename(filename)}`]
      );
    }

    return true;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Remove export files older than specified days
   * @param {number} maxAgeDays - Maximum file age in days (default: 30)
   * @returns {object} { deleted: number, errors: number }
   */
  async cleanupOldExports(maxAgeDays = 30) {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    let deleted = 0;
    let errors = 0;

    const processDir = (dirPath) => {
      if (!fs.existsSync(dirPath)) return;
      
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recurse into tenant subdirectories
          processDir(fullPath);
          // Remove empty tenant dirs
          const remaining = fs.readdirSync(fullPath);
          if (remaining.length === 0) {
            fs.rmdirSync(fullPath);
          }
        } else if (entry.name.endsWith('.pdf') || entry.name.endsWith('.xlsx')) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.birthtime < cutoff) {
              fs.unlinkSync(fullPath);
              deleted++;
            }
          } catch (err) {
            console.error(`[Export Cleanup] Error deleting ${fullPath}:`, err.message);
            errors++;
          }
        }
      }
    };

    processDir(this.baseOutputDir);

    // Clean up stale report_history output_path references
    await pool.query(
      `UPDATE report_history SET output_path = NULL 
       WHERE output_path IS NOT NULL AND executed_at < $1`,
      [cutoff]
    );

    console.log(`[Export Cleanup] Deleted ${deleted} files older than ${maxAgeDays} days (${errors} errors)`);
    return { deleted, errors };
  }
}

let instance = null;
const getExportService = () => {
  if (!instance) instance = new ExportService();
  return instance;
};

module.exports = { ExportService, getExportService };