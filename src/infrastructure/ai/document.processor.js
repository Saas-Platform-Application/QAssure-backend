/**
 * Document Processor - QAssure Platform
 * Extracts text from PDF, DOCX, and text files
 */
const fs = require('fs').promises;
const path = require('path');

// Polyfill browser globals required by pdfjs-dist (used internally by pdf-parse v2.x)
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      const m = new Float64Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      if (Array.isArray(init)) init.forEach((v, i) => (m[i] = v));
      this._m = m;
    }
    get a() { return this._m[0]; } set a(v) { this._m[0] = v; }
    get b() { return this._m[1]; } set b(v) { this._m[1] = v; }
    get c() { return this._m[4]; } set c(v) { this._m[4] = v; }
    get d() { return this._m[5]; } set d(v) { this._m[5] = v; }
    get e() { return this._m[12]; } set e(v) { this._m[12] = v; }
    get f() { return this._m[13]; } set f(v) { this._m[13] = v; }
    get is2D() { return true; }
    get isIdentity() { return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0; }
    inverse() { return new DOMMatrix(); }
    multiply() { return new DOMMatrix(); }
    transformPoint(p) { return { x: p?.x || 0, y: p?.y || 0, z: p?.z || 0, w: p?.w || 1 }; }
    toString() { return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`; }
  };
}
if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class Path2D { constructor() {} addPath() {} closePath() {} moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} arc() {} arcTo() {} rect() {} };
}

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class DocumentProcessor {
  constructor() {
    this.supportedTypes = ['.pdf', '.docx', '.doc', '.txt', '.md', '.json', '.xlsx', '.xls'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Robust wrapper for pdf-parse (handles both classic v1.1 and modern v2.x)
   */
  async _parsePdf(buffer) {
    // Case 1: Classic pdf-parse (returns a function)
    if (typeof pdfParse === 'function') {
      return await pdfParse(buffer);
    }

    // Case 2: Modern pdf-parse v2.x (returns an object with PDFParse class)
    if (pdfParse.PDFParse) {
      const { PDFParse } = pdfParse;
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const info = await parser.getInfo();
      const text = result.text || "";
      await parser.destroy();
      
      return {
        text,
        numpages: info.pages,
        info: info.metadata,
        version: info.version || 'unknown'
      };
    }

    throw new Error('Unsupported pdf-parse version or invalid export structure');
  }

  /**
   * Process a document and extract text
   */
  async process(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    if (!this.supportedTypes.includes(ext)) {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const stats = await fs.stat(filePath);
    if (stats.size > this.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.maxFileSize})`);
    }

    let text = '';
    let metadata = {
      fileName,
      fileType: ext,
      fileSize: stats.size,
      processedAt: new Date().toISOString()
    };

    switch (ext) {
      case '.pdf':
        const pdfResult = await this.processPDF(filePath);
        text = pdfResult.text;
        metadata = { ...metadata, ...pdfResult.metadata };
        break;

      case '.docx':
      case '.doc':
        const docResult = await this.processDOCX(filePath);
        text = docResult.text;
        metadata = { ...metadata, ...docResult.metadata };
        break;

      case '.txt':
      case '.md':
        text = await this.processText(filePath);
        break;

      case '.json':
        text = await this.processJSON(filePath);
        break;
    }

    return {
      text: this.cleanText(text),
      metadata,
      charCount: text.length,
      wordCount: this.countWords(text)
    };
  }

  /**
   * Process PDF file
   */
  async processPDF(filePath) {
    const buffer = await fs.readFile(filePath);
    const data = await this._parsePdf(buffer);

    return {
      text: data.text,
      metadata: {
        pageCount: data.numpages,
        pdfInfo: data.info,
        pdfVersion: data.version
      }
    };
  }

  /**
   * Process DOCX file
   */
  async processDOCX(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });  

    return {
      text: result.value,
      metadata: {
        warnings: result.messages
      }
    };
  }

  /**
   * Process plain text file
   */
  async processText(filePath) {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Process JSON file
   */
  async processJSON(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);
    return JSON.stringify(json, null, 2);
  }

  /**
   * Process buffer directly
   */
  async processBuffer(buffer, mimeType, fileName = 'document') {
    let text = '';
    let metadata = {
      fileName,
      fileType: mimeType,
      fileSize: buffer.length,
      processedAt: new Date().toISOString()
    };

    switch (mimeType) {
      case 'application/pdf':
        const pdfData = await this._parsePdf(buffer);
        text = pdfData.text;
        metadata.pageCount = pdfData.numpages;
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        const docResult = await mammoth.extractRawText({ buffer });
        text = docResult.value;
        break;

      case 'text/plain':
      case 'text/markdown':
        text = buffer.toString('utf-8');
        break;

      case 'application/json':
        text = buffer.toString('utf-8');
        break;

      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        text = await this._processExcelBuffer(buffer);
        break;
  
      default:
        throw new Error(`Unsupported mime type: ${mimeType}`);
        }

    return {
      text: this.cleanText(text),
      metadata,
      charCount: text.length,
      wordCount: this.countWords(text)
    };
  }

  /**
   * Clean extracted text
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive newlines
      .replace(/[ \t]+/g, ' ')          // Normalize spaces
      .replace(/^\s+|\s+$/gm, '')       // Trim lines
      .trim();
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if file type is supported
   */
  isSupported(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedTypes.includes(ext);
  }

  /**
   * Get supported file types
   */
  getSupportedTypes() {
    return this.supportedTypes;
  }
  /**
   * Convert Excel buffer to CSV text using exceljs
   */
  async _processExcelBuffer(buffer) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const lines = [];
    workbook.eachSheet((sheet) => {
      lines.push(`--- Sheet: ${sheet.name} ---`);
      sheet.eachRow((row) => {
        const values = row.values.slice(1).map(v => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object' && v.result !== undefined) return String(v.result);
          return String(v);
        });
        lines.push(values.join(','));
      });
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * LTTS multimodal ingestion: PDF -> rasterize -> YOLO (regions) -> LLaVA (per-page text).
   * Returns the same shape as processBuffer so knowledge.service can call either.
   *
   * options.tenantId       - for tenant-scoped provider resolution
   * options.llavaProvider  - tenant-config provider name for LLaVA
   */
  async processBufferMultimodal(buffer, mimeType, fileName, options = {}) {
    if (mimeType !== "application/pdf") {
      return this.processBuffer(buffer, mimeType, fileName);
    }

    const { getYoloClient } = require("./yolo.client");
    const { getLlavaClient } = require("./llava.client");
    const yolo = getYoloClient();
    const llava = getLlavaClient();

    // If LLaVA is not configured, fall back to standard PDF text extraction
    // (avoids storing "[Vision processing failed: ...]" as searchable content)
    if (!llava.isConfigured()) {
      console.warn(
        "[DocumentProcessor] LLaVA not configured — falling back to standard PDF text extraction for multimodal mode.",
      );
      return this.processBuffer(buffer, mimeType, fileName);
    }

    let pages;
    try {
      pages = await this.rasterizePdf(buffer);
    } catch (err) {
      console.warn(
        "[DocumentProcessor] PDF rasterization failed, falling back to standard extraction:",
        err.message,
      );
      return this.processBuffer(buffer, mimeType, fileName);
    }

    const pagesText = [];

    for (const page of pages) {
      let regions = [];
      if (yolo.isConfigured()) {
        try {
          regions = await yolo.detect(page.base64);
        } catch (err) {
          console.warn("[DocumentProcessor] YOLO detection failed for page", page.pageNumber, ":", err.message);
        }
      }

      const regionSummary = regions.length
        ? regions.map((r, i) => "  " + (i+1) + ". " + r.type + " (confidence " + Math.round(r.confidence*100) + "%) bbox=" + JSON.stringify(r.bbox)).join("\n")
        : "no regions detected (text-only page)";

      const prompt = [
        "This is page " + page.pageNumber + " of a document.",
        "YOLO detected the following regions:",
        regionSummary,
        "",
        "Provide a complete textual representation of this page including all text, tables (as structured text), and descriptions of any figures or images.",
      ].join("\n");

      try {
        const result = await llava.generate(page.base64, prompt, { maxTokens: 2048 });
        if (result.text && result.text.trim()) {
          pagesText.push("--- Page " + page.pageNumber + " ---\n" + result.text);
        } else {
          console.warn("[DocumentProcessor] LLaVA returned empty text for page", page.pageNumber);
        }
      } catch (err) {
        console.error("[DocumentProcessor] LLaVA call failed for page", page.pageNumber, ":", err.message);
        // Don't push error strings — they would be embedded as fake content
      }
    }

    // If vision pipeline produced no usable text, fall back to standard extraction
    if (pagesText.length === 0) {
      console.warn(
        "[DocumentProcessor] Multimodal pipeline produced no text for any page — falling back to standard PDF text extraction.",
      );
      return this.processBuffer(buffer, mimeType, fileName);
    }

    const text = pagesText.join("\n\n");
    return {
      text: this.cleanText(text),
      metadata: {
        fileName,
        fileType: mimeType,
        fileSize: buffer.length,
        processedAt: new Date().toISOString(),
        processingMode: "multimodal",
        pageCount: pages.length,
        pagesWithVisionText: pagesText.length,
      },
      charCount: text.length,
      wordCount: this.countWords(text),
    };
  }

  /**
   * Rasterize a PDF buffer into per-page PNG images (base64-encoded).
   * Used by the multimodal ingestion pipeline (LTTS: YOLO -> LLaVA -> DistilBERT).
   *
   * @param {Buffer} buffer - PDF file buffer
   * @param {Object} opts   - { scale: 2.0 } rendering scale
   * @returns {Promise<Array<{pageNumber: number, mimeType: string, base64: string}>>}
   */
  async rasterizePdf(buffer, opts = {}) {
    const { fromBuffer } = require('pdf2pic');
    const density = opts.density || 200; // 200 DPI: good quality for YOLO/LLaVA
    const convert = fromBuffer(buffer, {
      density,
      format: 'png',
      preserveAspectRatio: true,
    });
    const results = await convert.bulk(-1, { responseType: 'base64' });
    return results.map((r, i) => ({
      pageNumber: r.page || (i + 1),
      mimeType: 'image/png',
      base64: r.base64,
    }));
  }

  /**
   * Classify a file for multimodal processing.
   * Returns { mode: 'visual' | 'text', mimeType, data }
   *   visual  → send as base64 to LLM's vision capability
   *   text    → extract text and pass as variable
   */
  classifyForMultimodal(buffer, mimeType) {
    const visualTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ];

    const textExtractableTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain', 'text/markdown', 'text/csv',
      'application/json'
    ];

    if (visualTypes.includes(mimeType)) {
      return { mode: 'visual', mimeType, data: buffer.toString('base64') };
    }

    if (textExtractableTypes.includes(mimeType)) {
      return { mode: 'text', mimeType };
    }

    throw new Error(`Unsupported file type for multimodal: ${mimeType}`);
  }
}


// Singleton
let instance = null;
const getDocumentProcessor = () => {
  if (!instance) {
    instance = new DocumentProcessor();
  }
  return instance;
};

module.exports = { DocumentProcessor, getDocumentProcessor };
