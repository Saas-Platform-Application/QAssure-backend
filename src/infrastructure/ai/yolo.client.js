/**
 * YOLO Client - QAssure Platform
 * Calls LTTS's YOLO inference server for document layout detection.
 *
 * Verified contract (LTTS Azure deployment, May 2026):
 *   POST {endpoint}, multipart/form-data with field "file" = image bytes
 *   Auth: Authorization: Bearer {api-key}
 *   Response: {
 *     "object": "vision.detection",
 *     "model": "./models/best.pt",
 *     "detections": [
 *       { "class_id", "class_name", "confidence", "bbox_xyxy": [x1, y1, x2, y2] }
 *     ]
 *   }
 */
const axios = require('axios');
const FormData = require('form-data');

class YoloClient {
  constructor(config = {}) {
    this.endpoint = config.endpoint || process.env.LTTS_YOLO_ENDPOINT;
    this.apiKey = config.apiKey || process.env.LTTS_YOLO_API_KEY || null;
    this.timeout = config.timeout || 60000;
    this.minConfidence = config.minConfidence ?? 0.3;
  }

  isConfigured() {
    return !!this.endpoint;
  }

  async detect(base64) {
    if (!this.isConfigured()) {
      throw new Error('YOLO endpoint not configured. Set LTTS_YOLO_ENDPOINT env var.');
    }
    const buffer = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append('file', buffer, { filename: 'page.png', contentType: 'image/png' });

    const headers = { ...form.getHeaders() };
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;

    const response = await axios.post(this.endpoint, form, {
      headers,
      timeout: this.timeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const detections = response.data?.detections || [];
    return detections
      .filter((d) => (d.confidence ?? 1) >= this.minConfidence)
      .map((d) => ({
        type: this._normalizeType(d.class_name),
        className: d.class_name,
        confidence: d.confidence,
        bbox: Array.isArray(d.bbox_xyxy) ? d.bbox_xyxy : [0, 0, 0, 0],
      }));
  }

  _normalizeType(rawClassName) {
    if (!rawClassName) return 'other';
    const t = String(rawClassName).toLowerCase();
    if (t.includes('table')) return 'table';
    if (t.includes('figure') || t.includes('image') || t.includes('picture')) return 'figure';
    if (t.includes('text') || t.includes('paragraph') || t.includes('title') || t.includes('heading')) return 'text';
    return 'other';
  }
}

let instance = null;
const getYoloClient = (config) => {
  if (!instance || config) instance = new YoloClient(config);
  return instance;
};

module.exports = { YoloClient, getYoloClient };
